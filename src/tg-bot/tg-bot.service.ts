import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import axios from 'axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { TelegrafContext } from './types';
import { AnswerData, FitQuestionnaire } from './fit-questionnaire';
import { InputDataType, InputUtilsService, ValidationResult } from './input-utils.service';
import { InlineKeyboardService } from './inline-keyboard.service';
import { promises as fs } from 'fs';

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
    private readonly inputUtilsService: InputUtilsService,
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
      const questionnaireData = await this.cacheGet(ctx);
      const { currentQuestionIndex } = questionnaireData;
      if (currentQuestionIndex === 0) {
        await ctx.reply(`Great, let's start!`);
      } else {
        await ctx.reply(`Ok, let's continue!`);
      }
      await this.showQuestion(ctx, questionnaireData);
    } catch (error) {
      this.logger.error('start', error);
      await ctx.reply(this.serviceErrorText);
    }
  }

  getUserId(ctx: TelegrafContext): [string, number] {
    fs.writeFile('message-callback-example.json', JSON.stringify(ctx, null, 2));
    const currentUpdate = ctx.update;
    if (!('message' in currentUpdate)) throw new Error('No message');
    const userId = currentUpdate.message.from.id;
    const userKey = userId.toString();
    return [userKey, userId];
  }

  getUserInfo(ctx: TelegrafContext): string | null {
    const currentUpdate = ctx.update;
    if (!('message' in currentUpdate)) throw new Error('No message');
    return currentUpdate.message.from.username
      ? '@' + currentUpdate.message.from.username
      : currentUpdate.message.from.first_name
        ? currentUpdate.message.from.first_name
        : null;
  }

  async cacheGet(ctx: TelegrafContext): Promise<FitQuestionnaire> {
    const [userKey, userId] = this.getUserId(ctx);
    const userInfo = this.getUserInfo(ctx);
    const previousData = await this.cacheManager.get<string>(userKey);
    if (!previousData) return new FitQuestionnaire(userId, userInfo);
    const questionnaireData = JSON.parse(previousData) as FitQuestionnaire;
    return questionnaireData;
  }

  async cacheSet(ctx: TelegrafContext, questionnaireData: FitQuestionnaire) {
    const [userKey] = this.getUserId(ctx);
    await this.cacheManager.set(userKey, JSON.stringify(questionnaireData));
  }

  async showQuestion(ctx: TelegrafContext, questionnaireData: FitQuestionnaire): Promise<void> {
    try {
      const [type, text, placeholder] = this.getQuestionData(questionnaireData);

      switch (type) {
        case 'boolean':
          await this.showBooleanQuestion(ctx, text);
          break;
        case 'options':
          await this.showOptionsQuestion(ctx, text);
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
        input_field_placeholder: '8',
        inline_keyboard: this.inlineKeyboardService.getBooleanSelector(),
      },
    });
  }

  async showOptionsQuestion(ctx: TelegrafContext, text: string): Promise<void> {
    this.logger.log('showOptionsQuestion', ctx, text);
  }

  async checkAnswer(ctx: TelegrafContext): Promise<void> {
    try {
      const currentUpdate = ctx.update;
      if (!('message' in currentUpdate)) throw new Error('No message');
      if (!('text' in currentUpdate.message)) throw new Error('No text');
      const questionnaireData = await this.cacheGet(ctx);

      // Handle a rare case when cache expires mid-conversation
      if ('reply_to_message' in currentUpdate.message && 'text' in currentUpdate.message.reply_to_message) {
        const currentQuestionText = this.getQuestionData(questionnaireData)[1];
        const { text } = currentUpdate.message.reply_to_message;
        if (text !== currentQuestionText) {
          await ctx.reply('Sorry for the inconvenience, we need to restart your session.');
          await this.showQuestion(ctx, questionnaireData);
          return;
        }
      }

      const { text } = currentUpdate.message;
      // TODO: extract getQuestionData into utils
      const [type] = this.getQuestionData(questionnaireData);

      if (type === 'options' || type === 'boolean') return this.checkOptionsAnswer(ctx);
      const { isValid, errors } = await this.inputUtilsService.validate[type](text);
      if (!isValid) return this.invalidAnswer(ctx, errors);

      this.addResponse(text, questionnaireData);
      if (this.isQuestionnaireComplete(questionnaireData)) {
        await this.completeQuestionnaire(questionnaireData);
        return;
      }
      await this.cacheSet(ctx, questionnaireData);
      this.showQuestion(ctx, questionnaireData);
    } catch (error) {
      this.logger.error('checkAnswer', error);
      await ctx.reply(this.serviceErrorText);
    }
  }

  async checkOptionsAnswer(ctx: TelegrafContext): Promise<void> {
    console.log('checkOptionsAnswer', ctx.update);
    // TODO: habdle case if data is sent as text
    // if (!('message' in ctx.update)) throw new Error('No message');
    // if (!('text' in ctx.update.message)) throw new Error('No text');
    // const { text } = ctx.update.message;

    if (!('data' in ctx.callbackQuery)) throw new Error('No data in the callback');
    const questionnaireData = await this.cacheGet(ctx);
    const [type] = this.getQuestionData(questionnaireData);
    // TODO: use validation only in case of text input
    if (type === 'boolean') {
      const { data } = ctx.callbackQuery;
      const { isValid, errors } = await this.inputUtilsService.validate[type](data);
      if (!isValid) return this.invalidAnswer(ctx, errors);
      this.addResponse(data, questionnaireData);
    }
    if (this.isQuestionnaireComplete(questionnaireData)) {
      await this.completeQuestionnaire(questionnaireData);
      return;
    }
    await this.cacheSet(ctx, questionnaireData);
    this.showQuestion(ctx, questionnaireData);
  }

  async invalidAnswer(ctx: TelegrafContext, errors: ValidationResult['errors']): Promise<void> {
    for (const error of errors) {
      await ctx.reply(error);
    }
  }

  async restart(ctx: TelegrafContext): Promise<void> {
    // TODO: probably refactor and re-use start
    const questionnaireData = await this.cacheGet(ctx);
    questionnaireData.currentQuestionIndex = 0;
    await ctx.reply(`Ok, let's start from the beginning!`);
    await this.showQuestion(ctx, questionnaireData);
  }

  getQuestionData(questionnaire: FitQuestionnaire): [InputDataType, string, string | undefined] {
    const question = questionnaire.questions[questionnaire.currentQuestionIndex];
    const { text, placeholder, type } = question;
    return [type, text, placeholder];
  }

  addResponse(response: AnswerData, questionnaire: FitQuestionnaire): void {
    // TODO: probably parse data;
    questionnaire.questions[questionnaire.currentQuestionIndex].response = response;
    questionnaire.currentQuestionIndex += 1;
  }

  isQuestionnaireComplete(questionnaire: FitQuestionnaire): boolean {
    return questionnaire.currentQuestionIndex === questionnaire.questions.length;
  }

  async completeQuestionnaire(questionnaire: FitQuestionnaire): Promise<void> {
    const { userId, userInfo } = questionnaire;
    const date = new Date();
    await this.tgBot.telegram.sendMessage(
      userId,
      'Thank you for your answers!\n\nPlease reach out to @DriadaRoids to get the results.',
    );
    const responseHeader = `${date}\nПользователь ${userInfo} заполнил опрос:\n\n`;
    const responseBody = questionnaire.questions.map((q) => `*${q.responseKey}:*\n${q.response}`).join('\n\n');

    await this.tgBot.telegram.sendMessage(userId, responseHeader);
    await this.tgBot.telegram.sendMessage(userId, responseBody, {
      parse_mode: 'Markdown',
    });
    // send photo
  }
}
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
