import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import axios from 'axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TelegrafContext } from './types';
import { InlineKeyboardService } from './inline-keyboard.service';
import { InputUtilsService } from './input-utils.service';
import { FitQuestionnaire } from './fit-questionnaire';

@Injectable()
export class TgBotService {
  private readonly logger = new Logger(TgBotService.name);
  private readonly adminId: number;
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly inlineKeyboardService: InlineKeyboardService,
    private readonly inputUtilsService: InputUtilsService,
  ) {
    this.adminId = Number(this.configService.get<number>('TG_BOT_ADMIN_ID'));
  }

  async start(ctx: TelegrafContext): Promise<void> {
    const currentUpdate = ctx.update;
    if (!('message' in currentUpdate)) throw new Error('No message');
    const userId = currentUpdate.message.from.id;
    const userKey = userId.toString();
    const previousData = await this.cacheManager.get<string>(userKey);
    if (previousData) {
      const questionnaireData = JSON.parse(previousData) as FitQuestionnaire;
      const { currentQuestionIndex } = questionnaireData;
      await this.continueQuestionnaire(ctx, currentQuestionIndex);
      return;
    }
    const newUserQuestionnaire = new FitQuestionnaire(userId);
    const [questionText, placeholder] = newUserQuestionnaire.getQuestionData();

    await ctx.reply(`Great, let's start!`);
    await ctx.reply(questionText, {
      reply_markup: {
        force_reply: true,
        input_field_placeholder: placeholder ?? '',
      },
    });
    await this.cacheManager.set(userKey, JSON.stringify(newUserQuestionnaire));
  }

  async continueQuestionnaire(
    ctx: TelegrafContext,
    questionIndex: number,
  ): Promise<void> {
    await ctx.reply(`Ok, let's continue!`);
    await this.showQuestion(ctx, questionIndex);
  }

  async showQuestion(
    ctx: TelegrafContext,
    questionIndex: number,
  ): Promise<void> {
    // encapsulate show question logic
    console.log('showQuestion ctx', ctx);
    console.log('showQuestion questionIndex', questionIndex);
  }

  async test(ctx: TelegrafContext): Promise<void> {
    if (!('message' in ctx.update)) throw new Error('No message');
    if (!('text' in ctx.update.message)) throw new Error('No text');
    const res = await this.inputUtilsService.validate['number'](
      ctx.update.message.text,
    );

    console.log('input', ctx.update.message.text, 'res', res);
  }

  async sendCallback(ctx: TelegrafContext): Promise<void> {
    await ctx.reply('Choose your goal:', {
      reply_markup: {
        inline_keyboard: this.inlineKeyboardService.getGoalSelector(),
      },
    });
  }

  async testCallback(ctx: TelegrafContext): Promise<void> {
    if (!('data' in ctx.callbackQuery))
      throw new Error('No data in the callback');
    // const fakeOptions = ['asdf', 'qwer', 'zxcv'];
    const options = this.inlineKeyboardService.getGoalSelector().map((row) => {
      const [option] = row;
      return option['callback_data'];
    });
    console.log('options', options);
    const { data } = ctx.callbackQuery;
    const res = await this.inputUtilsService.validate['options'](data, options);
    console.log('input', data, 'res', res);
  }
}
