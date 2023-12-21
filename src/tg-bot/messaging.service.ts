import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { InlineKeyboardService } from './inline-keyboard.service';
import { TelegrafContext } from './types';
import { Questionnaire } from './questionnaire';
import { ValidationResult } from './validation.service';
import { QuestionnaireCompletionReport } from './questionnaire.service';

@Injectable()
export class MessagingService {
  private readonly adminId: number;
  private readonly sessionRestartRequiredText: string;
  constructor(
    @InjectBot('tg-bot') private tgBot: Telegraf<Context>,
    private readonly configService: ConfigService,
    private readonly inlineKeyboardService: InlineKeyboardService,
  ) {
    this.adminId = Number(this.configService.get<number>('TG_BOT_ADMIN_ID'));
    this.sessionRestartRequiredText = this.configService.get('tg-bot.messages.sessionRestartRequired');
  }

  async sendPreMessage(ctx: TelegrafContext, questionnaire: Questionnaire): Promise<void> {
    const question = questionnaire.questions[questionnaire.currentQuestionIndex];
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

  async sendTextQuestion(ctx: TelegrafContext, text: string, placeholder: string): Promise<void> {
    await ctx.reply(text, {
      reply_markup: {
        force_reply: true,
        input_field_placeholder: placeholder ?? '',
      },
    });
  }

  async sendBooleanQuestion(ctx: TelegrafContext, text: string): Promise<void> {
    await ctx.reply(text, {
      reply_markup: {
        force_reply: true,
        input_field_placeholder: '',
        inline_keyboard: this.inlineKeyboardService.renderBooleanSelector(),
      },
    });
  }

  async sendOptionsQuestion(ctx: TelegrafContext, questionnaireData: Questionnaire): Promise<void> {
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

  async sendInvalidAnswerMessage(ctx: TelegrafContext, errors: ValidationResult['errors']): Promise<void> {
    for (const error of errors) {
      await ctx.reply(error);
    }
  }

  async sendRestartRequiredMessage(ctx: TelegrafContext): Promise<void> {
    await ctx.reply(this.sessionRestartRequiredText);
  }

  async sendCompletionMessages(userId: number, report: QuestionnaireCompletionReport): Promise<void> {
    try {
      await this.tgBot.telegram.sendMessage(userId, this.configService.get('tg-bot.messages.userSurveycomplete'));

      const [responseHeader, responseBody, responseData] = report;
      await this.tgBot.telegram.sendMessage(this.adminId, responseHeader);
      await this.tgBot.telegram.sendMessage(this.adminId, responseBody, {
        parse_mode: 'Markdown',
      });
      await this.tgBot.telegram.sendPhoto(this.adminId, {
        source: Buffer.from(responseData),
      });
    } catch (error) {
      const logger = new Logger(MessagingService.name);
      logger.error('sendCompletionMessages', error);
      await this.tgBot.telegram.sendMessage(
        this.adminId,
        this.configService.get('tg-bot.messages.adminSurveyCompleteError'),
      );
    }
  }
}
