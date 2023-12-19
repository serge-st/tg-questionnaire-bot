import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { User as TgUser } from 'telegraf/typings/core/types/typegram';
import { Context, Telegraf } from 'telegraf';
import axios from 'axios';
import { TelegrafContext, TelegrafContextWithUser } from './types';
import { CacheService } from './cache.service';
import { UtilsService, ValidationResult } from './utils.service';
import { InlineKeyboardService } from './inline-keyboard.service';
import { Questionnaire } from './questionnaire';

@Injectable()
export class TgBotService {
  private readonly logger = new Logger(TgBotService.name);
  private readonly serviceErrorText: string =
    'Something went wrong.\n\nPlease use /restart command to start from the beginning.\n\nIf the problem persists, please contact @DriadaRoids';
  private readonly adminId: number;
  constructor(
    @InjectBot('tg-bot') private tgBot: Telegraf<Context>,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly utilsService: UtilsService,
    private readonly inlineKeyboardService: InlineKeyboardService,
  ) {
    this.adminId = Number(this.configService.get<number>('TG_BOT_ADMIN_ID'));
  }

  async help(ctx: TelegrafContext): Promise<void> {
    await ctx.reply(
      'We will create an effective cycle based on your goals.\n\nPlease use /start command to begin.\n\nPlease use /restart command to start from the beginning.\n\nIf you made a mistake you can use /edit_last_reply command to fix it.\n\nIf you have any questions, please contact @DriadaRoids',
    );
  }

  async start(ctx: TelegrafContextWithUser): Promise<void> {
    try {
      const cachedData = await this.cacheService.get(ctx.user.id);
      const questionnaireData = cachedData ? cachedData : await this.utilsService.startNewSession(ctx);
      const { currentQuestionIndex } = questionnaireData;
      if (currentQuestionIndex === 0) {
        await ctx.reply(`Great, let's start!`);
      } else {
        await ctx.reply(`Ok, let's continue!`);
      }
      await this.cacheService.set(ctx.user.id, questionnaireData);
      await this.showQuestion(ctx, questionnaireData);
    } catch (error) {
      this.logger.error('start', error);
      await ctx.reply(this.serviceErrorText);
    }
  }

  async restart(ctx: TelegrafContextWithUser): Promise<void> {
    try {
      const cachedData = await this.cacheService.get(ctx.user.id);
      const questionnaireData = cachedData ? cachedData : await this.utilsService.startNewSession(ctx);
      questionnaireData.currentQuestionIndex = 0;
      await ctx.reply(`Ok, let's start from the beginning!`);
      await this.cacheService.set(ctx.user.id, questionnaireData);
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

  // startNewSession(ctx: TelegrafContext): FitQuestionnaire {
  //   const { userId } = this.getUserId(ctx);
  //   const userInfo = this.getUserInfo(ctx);
  //   const questionnaireData = new FitQuestionnaire(userId, userInfo);
  //   return questionnaireData;
  // }

  async processPreMessage(ctx: TelegrafContext, questionnaireData: Questionnaire): Promise<void> {
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

  async shouldSkip(ctx: TelegrafContextWithUser, questionnaireData: Questionnaire): Promise<boolean> {
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

  async showQuestion(ctx: TelegrafContextWithUser, questionnaireData: Questionnaire): Promise<void> {
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

  async showOptionsQuestion(ctx: TelegrafContext, questionnaireData: Questionnaire): Promise<void> {
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

  async processResponse(text: string, questionnaireData: Questionnaire, ctx: TelegrafContextWithUser): Promise<void> {
    this.utilsService.addResponse(text, questionnaireData);
    if (this.utilsService.isQuestionnaireComplete(questionnaireData)) {
      await this.completeQuestionnaire(questionnaireData);
      return;
    }
    await this.cacheService.set(ctx.user.id, questionnaireData);
    await this.showQuestion(ctx, questionnaireData);
  }

  async checkAnswer(ctx: TelegrafContextWithUser): Promise<void> {
    try {
      const currentUpdate = ctx.update;
      if (!('message' in currentUpdate)) throw new Error('No message');
      if ('photo' in currentUpdate.message) return this.processPictureResponse(ctx);
      if (!('text' in currentUpdate.message)) throw new Error('No text');
      const questionnaireData = await this.cacheService.get(ctx.user.id);

      if (!questionnaireData) {
        await ctx.reply('Sorry for the inconvenience, we need to restart your session.');
        await this.restart(ctx);
        return;
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

  async processPictureResponse(ctx: TelegrafContextWithUser): Promise<void> {
    try {
      if (!('message' in ctx.update)) throw new Error('No message');
      if (!('photo' in ctx.update.message)) throw new Error('No photo');
      const questionnaireData = await this.cacheService.get(ctx.user.id);

      if (!questionnaireData) {
        await ctx.reply('Sorry for the inconvenience, we need to restart your session.');
        await this.restart(ctx);
        return;
      }

      const { file_id } = ctx.update.message.photo.at(-1);
      const fileLink = (await ctx.telegram.getFileLink(file_id)).toString();
      this.processResponse(fileLink, questionnaireData, ctx);
    } catch (error) {
      this.logger.error('processPictureResponse', error);
      await ctx.reply(this.serviceErrorText);
    }
  }

  async checkOptionsAnswer(ctx: TelegrafContextWithUser): Promise<void> {
    try {
      const questionnaireData = await this.cacheService.get(ctx.user.id);

      if (!questionnaireData) {
        await ctx.reply('Sorry for the inconvenience, we need to restart your session.');
        await this.restart(ctx);
        return;
      }

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

  async editLastReply(ctx: TelegrafContextWithUser): Promise<void> {
    const questionnaireData = await this.cacheService.get(ctx.user.id);
    if (!questionnaireData) {
      await ctx.reply('Sorry for the inconvenience, we need to restart your session.');
      await this.restart(ctx);
      return;
    }

    if (questionnaireData.currentQuestionIndex === 0) {
      await ctx.reply('This is the first question');
      return;
    }

    questionnaireData.currentQuestionIndex -= 1;
    await this.cacheService.set(ctx.user.id, questionnaireData);
    await this.showQuestion(ctx, questionnaireData);
  }

  async completeQuestionnaire(questionnaire: Questionnaire): Promise<void> {
    try {
      const { userId, userInfo } = questionnaire;
      const date = new Date();
      await this.tgBot.telegram.sendMessage(
        userId,
        'Thank you for your answers!\n\nPlease reach out to @DriadaRoids to get the results.',
      );
      const responseHeader = `${date}\nПользователь ${userInfo} заполнил опрос:\n\n`;
      const responseBody = questionnaire.questions
        .filter((q) => q.type !== 'picture' && q.response !== 'skipped')
        .map((q) => `*${q.responseKey}:*\n${q.response}`)
        .join('\n\n');

      await this.tgBot.telegram.sendMessage(this.adminId, responseHeader);
      await this.tgBot.telegram.sendMessage(this.adminId, responseBody, {
        parse_mode: 'Markdown',
      });

      // currently can handle only 1 picture per questionnaire
      const responsePicture = questionnaire.questions.find((q) => q.type === 'picture');
      const imageUrl = responsePicture.response.toString();
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      await this.tgBot.telegram.sendPhoto(this.adminId, {
        source: Buffer.from(response.data),
      });
      this.cacheService.delete(userId);
    } catch (error) {
      this.logger.error('completeQuestionnaire', error);
      await this.tgBot.telegram.sendMessage(this.adminId, 'Произошла ошибка при отправке отчета');
    }
  }
}
