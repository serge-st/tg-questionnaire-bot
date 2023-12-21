import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { TelegrafContext, TelegrafContextWithUser } from './types';
import { CacheService } from './cache.service';
import { ValidationService, ValidationResult } from './validation.service';
import { InlineKeyboardService } from './inline-keyboard.service';
import { Questionnaire } from './questionnaire';
import { QuestionnaireService } from './questionnaire.service';
import { CatchError } from './decorators';

@Injectable()
export class TgBotService {
  private readonly logger = new Logger(TgBotService.name);
  private readonly serviceErrorText: string;
  private readonly sessionRestartRequiredText: string;
  private readonly adminId: number;
  constructor(
    @InjectBot('tg-bot') private tgBot: Telegraf<Context>,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly validationService: ValidationService,
    private readonly inlineKeyboardService: InlineKeyboardService,
    private readonly questionnaireService: QuestionnaireService,
  ) {
    this.serviceErrorText = this.configService.get('tg-bot.messages.serviceError');
    this.sessionRestartRequiredText = this.configService.get('tg-bot.messages.sessionRestartRequired');
    this.adminId = Number(this.configService.get<number>('TG_BOT_ADMIN_ID'));
  }

  @CatchError((instance: TgBotService) => instance.serviceErrorText)
  async help(ctx: TelegrafContext): Promise<void> {
    await ctx.reply(this.configService.get('tg-bot.messages.help'));
  }

  @CatchError((instance: TgBotService) => instance.serviceErrorText)
  async start(ctx: TelegrafContextWithUser): Promise<void> {
    const cachedData = await this.cacheService.get(ctx.user.id);
    const questionnaireData = cachedData ? cachedData : this.questionnaireService.startNewSession(ctx);
    const { currentQuestionIndex } = questionnaireData;
    if (currentQuestionIndex === 0) {
      const startNewSessionText = this.configService.get('tg-bot.messages.startNewSession');
      await ctx.reply(startNewSessionText);
    } else {
      const continueSessionText = this.configService.get('tg-bot.messages.continueSession');
      await ctx.reply(continueSessionText);
    }
    await this.cacheService.set(ctx.user.id, questionnaireData);
    await this.showQuestion(ctx, questionnaireData);
  }

  @CatchError((instance: TgBotService) => instance.serviceErrorText)
  async restart(ctx: TelegrafContextWithUser): Promise<void> {
    const cachedData = await this.cacheService.get(ctx.user.id);
    const questionnaireData = cachedData ? cachedData : this.questionnaireService.startNewSession(ctx);
    questionnaireData.currentQuestionIndex = 0;
    const restartSessionText = this.configService.get('tg-bot.messages.restartSession');
    await ctx.reply(restartSessionText);
    await this.cacheService.set(ctx.user.id, questionnaireData);
    await this.showQuestion(ctx, questionnaireData);
  }

  @CatchError((instance: TgBotService) => instance.serviceErrorText)
  async editLastReply(ctx: TelegrafContextWithUser): Promise<void> {
    const questionnaireData = await this.cacheService.get(ctx.user.id);
    if (!questionnaireData) {
      await ctx.reply(this.sessionRestartRequiredText);
      await this.restart(ctx);
      return;
    }

    if (questionnaireData.currentQuestionIndex === 0) {
      const firstQuestionEditText = this.configService.get('tg-bot.messages.firstQuestionEdit');
      await ctx.reply(firstQuestionEditText);
      await this.showQuestion(ctx, questionnaireData);
      return;
    }

    questionnaireData.currentQuestionIndex -= 1;
    await this.cacheService.set(ctx.user.id, questionnaireData);
    await this.showQuestion(ctx, questionnaireData);
  }

  @CatchError((instance: TgBotService) => instance.serviceErrorText)
  async showPreMessage(ctx: TelegrafContext, questionnaireData: Questionnaire): Promise<void> {
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
      await ctx.reply(text, {
        parse_mode: 'Markdown',
      });
    }
  }

  @CatchError((instance: TgBotService) => instance.serviceErrorText)
  async showQuestion(ctx: TelegrafContextWithUser, questionnaireData: Questionnaire): Promise<void> {
    const shouldSkip = this.questionnaireService.shouldSkip(questionnaireData);
    if (shouldSkip) {
      await this.processResponse(ctx, 'skipped', questionnaireData);
      return;
    }
    await this.showPreMessage(ctx, questionnaireData);
    const [type, text, placeholder] = this.questionnaireService.getQuestionData(questionnaireData);

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

  @CatchError((instance: TgBotService) => instance.serviceErrorText)
  async processResponse(ctx: TelegrafContextWithUser, text: string, questionnaireData: Questionnaire): Promise<void> {
    this.questionnaireService.addResponse(text, questionnaireData);
    if (this.questionnaireService.isQuestionnaireComplete(questionnaireData)) {
      await this.sendCompletionMessages(questionnaireData);
      return;
    }
    await this.cacheService.set(ctx.user.id, questionnaireData);
    await this.showQuestion(ctx, questionnaireData);
  }

  @CatchError((instance: TgBotService) => instance.serviceErrorText)
  async checkAnswer(ctx: TelegrafContextWithUser): Promise<void> {
    const currentUpdate = ctx.update;
    if (!('message' in currentUpdate)) throw new Error('No message');
    if ('photo' in currentUpdate.message) return this.checkPictureAnswer(ctx);
    if (!('text' in currentUpdate.message)) throw new Error('No text');
    const questionnaireData = await this.cacheService.get(ctx.user.id);

    if (!questionnaireData) {
      await ctx.reply(this.sessionRestartRequiredText);
      await this.restart(ctx);
      return;
    }

    const { text } = currentUpdate.message;
    const [type] = this.questionnaireService.getQuestionData(questionnaireData);

    if (type === 'options' || type === 'boolean') return this.checkOptionsAnswer(ctx);
    const { isValid, errors } = await this.validationService.validate[type](text);
    if (!isValid) return await this.sendInvalidAnswerMessage(ctx, errors);

    this.processResponse(ctx, text, questionnaireData);
  }

  @CatchError((instance: TgBotService) => instance.serviceErrorText)
  async checkPictureAnswer(ctx: TelegrafContextWithUser): Promise<void> {
    if (!('message' in ctx.update)) throw new Error('No message');
    if (!('photo' in ctx.update.message)) throw new Error('No photo');
    const questionnaireData = await this.cacheService.get(ctx.user.id);

    if (!questionnaireData) {
      await ctx.reply(this.sessionRestartRequiredText);
      await this.restart(ctx);
      return;
    }

    const { file_id } = ctx.update.message.photo.at(-1);
    const fileLink = (await ctx.telegram.getFileLink(file_id)).toString();
    this.processResponse(ctx, fileLink, questionnaireData);
  }

  @CatchError((instance: TgBotService) => instance.serviceErrorText)
  async checkOptionsAnswer(ctx: TelegrafContextWithUser): Promise<void> {
    const questionnaireData = await this.cacheService.get(ctx.user.id);

    if (!questionnaireData) {
      await ctx.reply(this.sessionRestartRequiredText);
      await this.restart(ctx);
      return;
    }

    const [type, questionText] = this.questionnaireService.getQuestionData(questionnaireData);

    // Validate in case if answer provided as text and not via inline keyboard
    if ('message' in ctx.update && 'text' in ctx.update.message) {
      const { text } = ctx.update.message;

      switch (type) {
        case 'boolean': {
          const { isValid, errors } = await this.validationService.validate[type](text);
          if (!isValid) {
            await this.sendInvalidAnswerMessage(ctx, errors);
            await this.showBooleanQuestion(ctx, questionText);
            return;
          }

          this.processResponse(ctx, text, questionnaireData);
          break;
        }
        case 'options': {
          const question = questionnaireData.questions[questionnaireData.currentQuestionIndex];
          const optionStrings = question.options.map((option) => option.value.toString());
          const { isValid, errors } = await this.validationService.validate[type](text, optionStrings);
          if (!isValid) {
            await this.sendInvalidAnswerMessage(ctx, errors);
            await this.showOptionsQuestion(ctx, questionnaireData);
            return;
          }

          this.processResponse(ctx, text, questionnaireData);
          break;
        }
        default: {
          throw new Error('Invalid question type');
        }
      }
    }

    if ('callback_query' in ctx.update && 'data' in ctx.update.callback_query) {
      const { data } = ctx.update.callback_query;
      this.processResponse(ctx, data, questionnaireData);
    }
  }

  async sendInvalidAnswerMessage(ctx: TelegrafContext, errors: ValidationResult['errors']): Promise<void> {
    for (const error of errors) {
      await ctx.reply(error);
    }
  }

  async sendCompletionMessages(questionnaire: Questionnaire): Promise<void> {
    try {
      const { userId } = questionnaire;
      await this.tgBot.telegram.sendMessage(userId, this.configService.get('tg-bot.messages.userSurveycomplete'));

      const [responseHeader, responseBody, responseData] =
        await this.questionnaireService.getQuestionnareCompletionReport(questionnaire);

      await this.tgBot.telegram.sendMessage(this.adminId, responseHeader);
      await this.tgBot.telegram.sendMessage(this.adminId, responseBody, {
        parse_mode: 'Markdown',
      });
      await this.tgBot.telegram.sendPhoto(this.adminId, {
        source: Buffer.from(responseData),
      });

      this.cacheService.delete(userId);
    } catch (error) {
      this.logger.error('completeQuestionnaire', error);
      await this.tgBot.telegram.sendMessage(
        this.adminId,
        this.configService.get('tg-bot.messages.adminSurveyCompleteError'),
      );
    }
  }
}
