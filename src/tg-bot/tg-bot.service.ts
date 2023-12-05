import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import axios from 'axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TelegrafContext } from './types';
import { AnswerData, FitQuestionnaire } from './fit-questionnaire';
import { InputDataType, InputUtilsService } from './input-utils.service';
import { InlineKeyboardService } from './inline-keyboard.service';

@Injectable()
export class TgBotService {
  private readonly logger = new Logger(TgBotService.name);
  private readonly adminId: number;
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly inputUtilsService: InputUtilsService,
    private readonly inlineKeyboardService: InlineKeyboardService,
  ) {
    this.adminId = Number(this.configService.get<number>('TG_BOT_ADMIN_ID'));
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
    }
  }

  getUserId(ctx: TelegrafContext): [string, number] {
    const currentUpdate = ctx.update;
    if (!('message' in currentUpdate)) throw new Error('No message');
    const userId = currentUpdate.message.from.id;
    const userKey = userId.toString();
    return [userKey, userId];
  }

  async cacheGet(ctx: TelegrafContext): Promise<FitQuestionnaire> {
    this.logger.log('===> cacheGet');
    const [userKey, userId] = this.getUserId(ctx);
    this.logger.log('cacheGet for', userKey);
    const previousData = await this.cacheManager.get<string>(userKey);
    this.logger.log('cacheGet data', previousData);
    this.logger.log('==================');
    if (!previousData) return new FitQuestionnaire(userId);
    const questionnaireData = JSON.parse(previousData) as FitQuestionnaire;
    return questionnaireData;
  }

  async cacheSet(ctx: TelegrafContext, questionnaireData: FitQuestionnaire) {
    this.logger.log('===> cacheSet');
    const [userKey] = this.getUserId(ctx);
    this.logger.log('cacheSet for', userKey);
    this.logger.log('cacheSet data', JSON.stringify(questionnaireData));
    await this.cacheManager.set(userKey, JSON.stringify(questionnaireData));
    this.logger.log('==================');
  }

  async showQuestion(ctx: TelegrafContext, questionnaireData: FitQuestionnaire): Promise<void> {
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
    this.logger.log('showBooleanQuestion', ctx, text);
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
      console.log('questionnaireData', questionnaireData);
      const { text } = currentUpdate.message;
      // TODO: extract getQuestionData into utils
      const [type] = this.getQuestionData(questionnaireData);

      if (type === 'options' || type === 'boolean') return this.checkOptionsAnswer(ctx);
      const isValid = await this.inputUtilsService.validate[type](text);
      if (!isValid) return this.invalidAnswer(ctx);

      // TODO: probably parse data
      this.addResponse(text, questionnaireData);
      await this.cacheSet(ctx, questionnaireData);
      this.showQuestion(ctx, questionnaireData);
    } catch (error) {
      this.logger.error('checkAnswer', error);
    }
  }

  async checkOptionsAnswer(ctx: TelegrafContext): Promise<void> {
    this.logger.log('checkOptionsAnswer', ctx);
  }

  async invalidAnswer(ctx: TelegrafContext): Promise<void> {
    // TODO: add user friendly error messages
    await ctx.reply('Invalid answer, please try again');
  }

  getQuestionData(questionnaire: FitQuestionnaire): [InputDataType, string, string | undefined] {
    const question = questionnaire.questions[questionnaire.currentQuestionIndex];
    const { text, placeholder, type } = question;
    return [type, text, placeholder];
  }

  addResponse(response: AnswerData, questionnaire: FitQuestionnaire): void {
    // TODO: probably parse data
    questionnaire.questions[questionnaire.currentQuestionIndex].response = response;
    questionnaire.currentQuestionIndex += 1;
  }
}

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
