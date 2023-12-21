import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegrafContext, TelegrafContextWithUser } from './types';
import { CacheService } from './cache.service';
import { ValidationService } from './validation.service';
import { QuestionnaireService } from './questionnaire.service';
import { MessagingService } from './messaging.service';
import { Questionnaire } from './questionnaire';
import { CatchError } from './decorators';

@Injectable()
export class TgBotService {
  private readonly serviceErrorText: string;
  private readonly sessionRestartRequiredText: string;
  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly validationService: ValidationService,
    private readonly questionnaireService: QuestionnaireService,
    private readonly messagingService: MessagingService,
  ) {
    this.serviceErrorText = this.configService.get('tg-bot.messages.serviceError');
    this.sessionRestartRequiredText = this.configService.get('tg-bot.messages.sessionRestartRequired');
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
  async checkPhotoAnswer(ctx: TelegrafContextWithUser): Promise<void> {
    if (!('message' in ctx.update)) throw new Error('No message');
    if (!('photo' in ctx.update.message)) throw new Error('No photo');
    const questionnaire = await this.cacheService.get(ctx.user.id);

    if (!questionnaire) {
      await ctx.reply(this.sessionRestartRequiredText);
      await this.restart(ctx);
      return;
    }

    const [type] = this.questionnaireService.getQuestionData(questionnaire);
    if (type !== 'picture') {
      await this.messagingService.sendInvalidAnswerMessage(ctx, ['The reply should not be a picture']);
      await this.showQuestion(ctx, questionnaire);
      return;
    }

    const { file_id } = ctx.update.message.photo.at(-1);
    const fileLink = (await ctx.telegram.getFileLink(file_id)).toString();
    this.processResponse(ctx, fileLink, questionnaire);
  }

  @CatchError((instance: TgBotService) => instance.serviceErrorText)
  async checkAnswer(ctx: TelegrafContextWithUser): Promise<void> {
    const currentUpdate = ctx.update;
    if (!('message' in currentUpdate)) throw new Error('No message');
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
    if (!isValid) return await this.messagingService.sendInvalidAnswerMessage(ctx, errors);

    this.processResponse(ctx, text, questionnaireData);
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
            await this.messagingService.sendInvalidAnswerMessage(ctx, errors);
            await this.messagingService.sendBooleanQuestion(ctx, questionText);
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
            await this.messagingService.sendInvalidAnswerMessage(ctx, errors);
            await this.messagingService.sendOptionsQuestion(ctx, questionnaireData);
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

  @CatchError((instance: TgBotService) => instance.serviceErrorText)
  async showQuestion(ctx: TelegrafContextWithUser, questionnaireData: Questionnaire): Promise<void> {
    const shouldSkip = this.questionnaireService.shouldSkip(questionnaireData);
    if (shouldSkip) {
      await this.processResponse(ctx, 'skipped', questionnaireData);
      return;
    }
    await this.messagingService.sendPreMessage(ctx, questionnaireData);
    const [type, text, placeholder] = this.questionnaireService.getQuestionData(questionnaireData);

    switch (type) {
      case 'boolean':
        await this.messagingService.sendBooleanQuestion(ctx, text);
        break;
      case 'options':
        await this.messagingService.sendOptionsQuestion(ctx, questionnaireData);
        break;
      default:
        await this.messagingService.sendTextQuestion(ctx, text, placeholder);
        break;
    }
  }

  @CatchError((instance: TgBotService) => instance.serviceErrorText)
  async processResponse(ctx: TelegrafContextWithUser, text: string, questionnaire: Questionnaire): Promise<void> {
    this.questionnaireService.addResponse(text, questionnaire);
    if (this.questionnaireService.isQuestionnaireComplete(questionnaire)) {
      const { userId } = questionnaire;
      const report = await this.questionnaireService.getQuestionnareCompletionReport(questionnaire);
      await this.messagingService.sendCompletionMessages(userId, report);
      this.cacheService.delete(userId);
      return;
    }
    await this.cacheService.set(ctx.user.id, questionnaire);
    await this.showQuestion(ctx, questionnaire);
  }
}
