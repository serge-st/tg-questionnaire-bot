import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import axios from 'axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectBot } from 'nestjs-telegraf';
import { User as TgUser } from 'telegraf/typings/core/types/typegram';
import { Context, Telegraf } from 'telegraf';
import { TelegrafContext } from './types';
import { FitQuestionnaire } from './fit-questionnaire';
import { UtilsService, ValidationResult } from './utils.service';
import { InlineKeyboardService } from './inline-keyboard.service';

@Injectable()
export class TgBotService {
  private readonly logger = new Logger(TgBotService.name);
  private readonly serviceErrorText: string =
    'Something went wrong.\n\nPlease use /restart command to start from the beginning.\n\nIf the problem persists, please contact @DriadaRoids';
  private readonly adminId: number;
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectBot('tg-bot') private tgBot: Telegraf<Context>,
    private readonly configService: ConfigService,
    private readonly utilsService: UtilsService,
    private readonly inlineKeyboardService: InlineKeyboardService,
  ) {
    this.adminId = Number(this.configService.get<number>('TG_BOT_ADMIN_ID'));
  }

  async help(ctx: TelegrafContext): Promise<void> {
    await ctx.reply(
      'We will create an effective cycle based on your goals.\n\nPlease use /start command to begin.\n\nPlease use /restart command to start from the beginning.\n\nIf you have any questions, please contact @DriadaRoids',
    );
  }

  async start(ctx: TelegrafContext): Promise<void> {
    try {
      const cachedData = await this.cacheGet(ctx);
      const questionnaireData = cachedData ? cachedData : this.startNewSession(ctx);
      const { currentQuestionIndex } = questionnaireData;
      if (currentQuestionIndex === 0) {
        await ctx.reply(`Great, let's start!`);
      } else {
        await ctx.reply(`Ok, let's continue!`);
      }
      await this.cacheSet(ctx, questionnaireData);
      await this.showQuestion(ctx, questionnaireData);
    } catch (error) {
      this.logger.error('start', error);
      await ctx.reply(this.serviceErrorText);
    }
  }

  async restart(ctx: TelegrafContext): Promise<void> {
    try {
      const cachedData = await this.cacheGet(ctx);
      const questionnaireData = cachedData ? cachedData : this.startNewSession(ctx);
      questionnaireData.currentQuestionIndex = 0;
      await ctx.reply(`Ok, let's start from the beginning!`);
      await this.cacheSet(ctx, questionnaireData);
      await this.showQuestion(ctx, questionnaireData);
    } catch (error) {
      this.logger.error('restart', error);
      await ctx.reply(this.serviceErrorText);
    }
  }

  getUserId(ctx: TelegrafContext): { userKey: string; userId: number } {
    const updateFrom = this.getUpdateFrom(ctx);
    const userId = updateFrom.id;
    const userKey = userId.toString();
    return { userKey, userId };
  }

  getUpdateFrom(ctx: TelegrafContext): TgUser {
    if ('message' in ctx.update) {
      return ctx.update.message.from;
    } else if ('callback_query' in ctx.update) {
      return ctx.update.callback_query.from;
    } else {
      throw new Error('No message or callback_query');
    }
  }

  getUserInfo(ctx: TelegrafContext): string | null {
    const updateFrom = this.getUpdateFrom(ctx);
    return updateFrom.username ? '@' + updateFrom.username : updateFrom.first_name ? updateFrom.first_name : null;
  }

  startNewSession(ctx: TelegrafContext): FitQuestionnaire {
    const { userId } = this.getUserId(ctx);
    const userInfo = this.getUserInfo(ctx);
    const questionnaireData = new FitQuestionnaire(userId, userInfo);
    return questionnaireData;
  }

  async cacheGet(ctx: TelegrafContext): Promise<FitQuestionnaire | null> {
    const { userKey } = this.getUserId(ctx);
    const previousData = await this.cacheManager.get<string>(userKey);
    if (!previousData) return null;
    const questionnaireData = JSON.parse(previousData) as FitQuestionnaire;
    return questionnaireData;
  }

  async cacheSet(ctx: TelegrafContext, questionnaireData: FitQuestionnaire) {
    const { userKey } = this.getUserId(ctx);
    await this.cacheManager.set(userKey, JSON.stringify(questionnaireData));
  }

  async processPreMessage(ctx: TelegrafContext, questionnaireData: FitQuestionnaire): Promise<void> {
    const question = questionnaireData.questions[questionnaireData.currentQuestionIndex];
    const { preMessage } = question;
    if (!preMessage) return;
    const { text, link } = preMessage;
    if (link) {
      const { placeholder, url } = link;
      await ctx.reply(text, {
        reply_markup: {
          inline_keyboard: this.inlineKeyboardService.renderLink(placeholder, url),
        },
      });
    } else {
      await ctx.reply(text);
    }
  }

  async shouldSkip(ctx: TelegrafContext, questionnaireData: FitQuestionnaire): Promise<boolean> {
    const question = questionnaireData.questions[questionnaireData.currentQuestionIndex];
    const { skipIf } = question;
    if (!skipIf) return false;
    const [entries] = Object.entries(skipIf);
    const [key, value] = entries;
    const { questions } = questionnaireData;
    const result = questions.find((q) => q.responseKey === key && q.response === String(value));
    if (!result) return false;
    this.processResponse('skipped', questionnaireData, ctx);
    return true;
  }

  async showQuestion(ctx: TelegrafContext, questionnaireData: FitQuestionnaire): Promise<void> {
    try {
      const shouldSkip = await this.shouldSkip(ctx, questionnaireData);
      if (shouldSkip) return;
      await this.processPreMessage(ctx, questionnaireData);
      const [type, text, placeholder] = this.utilsService.getQuestionData(questionnaireData);

      switch (type) {
        case 'boolean':
          await this.showBooleanQuestion(ctx, text);
          break;
        case 'options':
          await this.showOptionsQuestion(ctx, questionnaireData);
          break;
        default:
          await this.showTextQuestion(ctx, text, placeholder);
          break;
      }
    } catch (error) {
      this.logger.error('showQuestion', error);
      await ctx.reply(this.serviceErrorText);
    }
  }

  async showTextQuestion(ctx: TelegrafContext, text: string, placeholder: string): Promise<void> {
    await ctx.reply(text, {
      reply_markup: {
        force_reply: true,
        input_field_placeholder: placeholder ?? '',
      },
    });
  }

  async showBooleanQuestion(ctx: TelegrafContext, text: string): Promise<void> {
    await ctx.reply(text, {
      reply_markup: {
        force_reply: true,
        input_field_placeholder: '',
        inline_keyboard: this.inlineKeyboardService.renderBooleanSelector(),
      },
    });
  }

  async showOptionsQuestion(ctx: TelegrafContext, questionnaireData: FitQuestionnaire): Promise<void> {
    const question = questionnaireData.questions[questionnaireData.currentQuestionIndex];
    const { text, options } = question;
    await ctx.reply(text, {
      reply_markup: {
        force_reply: true,
        input_field_placeholder: '',
        inline_keyboard: this.inlineKeyboardService.renderOptions(options),
      },
    });
  }

  async processResponse(text: string, questionnaireData: FitQuestionnaire, ctx: TelegrafContext): Promise<void> {
    this.utilsService.addResponse(text, questionnaireData);
    if (this.utilsService.isQuestionnaireComplete(questionnaireData)) {
      await this.completeQuestionnaire(questionnaireData);
      return;
    }
    await this.cacheSet(ctx, questionnaireData);
    await this.showQuestion(ctx, questionnaireData);
  }

  async checkAnswer(ctx: TelegrafContext): Promise<void> {
    try {
      const currentUpdate = ctx.update;
      if (!('message' in currentUpdate)) throw new Error('No message');
      if (!('text' in currentUpdate.message)) throw new Error('No text');
      const questionnaireData = await this.cacheGet(ctx);

      if (!questionnaireData) {
        ctx.reply('Sorry for the inconvenience, we need to restart your session.');
        this.restart(ctx);
      }

      const { text } = currentUpdate.message;
      const [type] = this.utilsService.getQuestionData(questionnaireData);

      if (type === 'options' || type === 'boolean') return this.checkOptionsAnswer(ctx);
      const { isValid, errors } = await this.utilsService.validate[type](text);
      if (!isValid) return await this.invalidAnswer(ctx, errors);

      this.processResponse(text, questionnaireData, ctx);
    } catch (error) {
      this.logger.error('checkAnswer', error);
      await ctx.reply(this.serviceErrorText);
    }
  }

  // TODO: if error on options or boolean, send error and inline keyboard again
  async checkOptionsAnswer(ctx: TelegrafContext): Promise<void> {
    try {
      const questionnaireData = await this.cacheGet(ctx);
      const [type, questionText] = this.utilsService.getQuestionData(questionnaireData);

      // Validate in case if answer provided as text and not via inline keyboard
      if ('message' in ctx.update && 'text' in ctx.update.message) {
        const { text } = ctx.update.message;

        switch (type) {
          case 'boolean': {
            const { isValid, errors } = await this.utilsService.validate[type](text);
            if (!isValid) {
              await this.invalidAnswer(ctx, errors);
              await this.showBooleanQuestion(ctx, questionText);
              return;
            }

            this.processResponse(text, questionnaireData, ctx);
            break;
          }
          case 'options': {
            const question = questionnaireData.questions[questionnaireData.currentQuestionIndex];
            const optionStrings = question.options.map((option) => option.value.toString());
            const { isValid, errors } = await this.utilsService.validate[type](text, optionStrings);
            if (!isValid) {
              await this.invalidAnswer(ctx, errors);
              await this.showOptionsQuestion(ctx, questionnaireData);
              return;
            }

            this.processResponse(text, questionnaireData, ctx);
            break;
          }
          default: {
            throw new Error('Invalid question type');
          }
        }
      }

      if ('callback_query' in ctx.update && 'data' in ctx.update.callback_query) {
        const { data } = ctx.update.callback_query;
        this.processResponse(data, questionnaireData, ctx);
      }
    } catch (error) {
      this.logger.error('checkOptionsAnswer', error);
      await ctx.reply(this.serviceErrorText);
    }
  }

  async invalidAnswer(ctx: TelegrafContext, errors: ValidationResult['errors']): Promise<void> {
    for (const error of errors) {
      await ctx.reply(error);
    }
  }

  async completeQuestionnaire(questionnaire: FitQuestionnaire): Promise<void> {
    const { userId, userInfo } = questionnaire;
    const date = new Date();
    await this.tgBot.telegram.sendMessage(
      userId,
      'Thank you for your answers!\n\nPlease reach out to @DriadaRoids to get the results.',
    );
    const responseHeader = `${date}\nПользователь ${userInfo} заполнил опрос:\n\n`;
    const responseBody = questionnaire.questions
      .filter((q) => q.response !== 'skipped')
      .map((q) => `*${q.responseKey}:*\n${q.response}`)
      .join('\n\n');

    await this.tgBot.telegram.sendMessage(userId, responseHeader);
    await this.tgBot.telegram.sendMessage(userId, responseBody, {
      parse_mode: 'Markdown',
    });
    // TODO: delete cache after the report is sent
    // send photo
  }
}

//     await ctx.reply(
//       'Please read the article where you can learn about 3 possible concepts of building a plan for the first cycle:',
//       {
//         parse_mode: 'Markdown',
//         reply_markup: {
//           inline_keyboard: this.inlineKeyboardService.getArticleLink(),
//         },
//       },
//     );

//   async processPhoto(ctx: TelegrafContext): Promise<void> {
//     try {
//       const currentUpdate = ctx.update;
//       if (!('message' in currentUpdate)) throw new Error('No message');
//       if (!('photo' in currentUpdate.message)) throw new Error('No photo');
//       const userId = currentUpdate.message.from.id;

//       const { file_id } = currentUpdate.message.photo.at(-1);
//       const fileLink = await ctx.telegram.getFileLink(file_id);

//       const response = await axios.get(fileLink.toString(), {
//         responseType: 'arraybuffer',
//       });
//       // const fileName = `${this.utilsService.getCurrentUTCDateTime()}-${userId}.jpg`;

//       await fs.writeFile(fileName, response.data);

//       await this.sendPhotoToAdmin(ctx, file_id);
//     } catch (error) {
//       this.logger.log(`${ctx.update.update_id} ${error}`);
//     }
//   }
// }

//   async sendPhotoToAdmin(ctx: TelegrafContext, fileId: string): Promise<void> {
//     try {
//       const fileLink = await ctx.telegram.getFileLink(fileId);
//       const response = await axios.get(fileLink.toString(), {
//         responseType: 'arraybuffer',
//       });
//       await ctx.telegram.sendPhoto(this.adminId, {
//         source: Buffer.from(response.data),
//       });
//     } catch (error) {
//       this.logger.log(`sendPhotoToAdmin: ${ctx.update.update_id} ${error}`);
//     }
//   }

// await this.tgBot.telegram.sendMessage(userId, `${date}\nПользователь ${userInfo} заполнил опрос:`);

// async test(ctx: TelegrafContext): Promise<void> {
//   if (!('message' in ctx.update)) throw new Error('No message');
//   if (!('text' in ctx.update.message)) throw new Error('No text');
//   const res = await this.inputUtilsService.validate['number'](
//     ctx.update.message.text,
//   );

//   console.log('input', ctx.update.message.text, 'res', res);

//   await ctx.reply(`You wrote: ${ctx.update.message.text}`, {
//     reply_markup: {
//       force_reply: true,
//       input_field_placeholder: 'Enter your age',
//     },
//   });
// }

// async sendCallback(ctx: TelegrafContext): Promise<void> {
//   await ctx.reply('Choose your goal:', {
//     reply_markup: {
//       inline_keyboard: this.inlineKeyboardService.getGoalSelector(),
//       force_reply: true,
//       input_field_placeholder: '',
//     },
//   });
// }

// async testCallback(ctx: TelegrafContext): Promise<void> {
//   if (!('data' in ctx.callbackQuery))
//     throw new Error('No data in the callback');
//   // const fakeOptions = ['asdf', 'qwer', 'zxcv'];
//   const options = this.inlineKeyboardService.getGoalSelector().map((row) => {
//     const [option] = row;
//     return option['callback_data'];
//   });
//   console.log('options', options);
//   const { data } = ctx.callbackQuery;
//   const res = await this.inputUtilsService.validate['options'](data, options);
//   console.log('input', data, 'res', res);
// }

// async start2(ctx: TelegrafContext): Promise<void> {
//   const currentUpdate = ctx.update;
//   if (!('message' in currentUpdate)) throw new Error('No message');
//   const userId = currentUpdate.message.from.id;
//   const userKey = userId.toString();
//   const previousData = await this.cacheManager.get<string>(userKey);
//   if (previousData) {
//     await ctx.reply(`Ok, let's continue!`);
//     // await this.showQuestion(ctx);
//     return;
//   }
//   const newUserQuestionnaire = new FitQuestionnaire(userId);

//   await ctx.reply(`Great, let's start!`);
//   // await this.showQuestion(ctx);
//   await this.cacheManager.set(userKey, JSON.stringify(newUserQuestionnaire));

//   // const questionnaireData = JSON.parse(previousData) as FitQuestionnaire;
//   // const { currentQuestionIndex } = questionnaireData;

//   // const [questionText, placeholder] = newUserQuestionnaire.getQuestionData();
//   // await ctx.reply(questionText, {
//   //   reply_markup: {
//   //     force_reply: true,
//   //     input_field_placeholder: placeholder ?? '',
//   //   },
//   // });
// }
