import { Injectable, Logger } from '@nestjs/common';
import { UtilsService } from 'utils/utils.service';
import { ConfigService } from '@nestjs/config';
import { TelegrafContext } from './types';
import { promises as fs } from 'fs';
import axios from 'axios';
import { InlineKeyboardService } from './inline-keyboard.service';
import { InputUtilsService } from './input-utils.service';

@Injectable()
export class TgBotService {
  private readonly logger = new Logger(TgBotService.name);
  private readonly adminId: number;
  constructor(
    private readonly utilsService: UtilsService,
    private readonly configService: ConfigService,
    private readonly inlineKeyboardService: InlineKeyboardService,
    private readonly inputUtilsService: InputUtilsService,
  ) {
    this.adminId = Number(this.configService.get<number>('TG_BOT_ADMIN_ID'));
  }

  async sendTestingMessage(ctx: TelegrafContext): Promise<void> {
    await ctx.reply('Hello testing');
  }

  async testBool(ctx: TelegrafContext): Promise<void> {
    await ctx.reply('This is my first cycle:', {
      reply_markup: {
        inline_keyboard: this.inlineKeyboardService.getBooleanSelector(),
      },
    });
  }

  async testGoal(ctx: TelegrafContext): Promise<void> {
    await ctx.reply('Choose your goal:', {
      reply_markup: {
        inline_keyboard: this.inlineKeyboardService.getGoalSelector(),
      },
    });
  }

  async testArticle(ctx: TelegrafContext): Promise<void> {
    await ctx.reply(
      'Please read the article where you can learn about 3 possible concepts of building a plan for the first cycle:',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: this.inlineKeyboardService.getArticleLink(),
        },
      },
    );
    await ctx.reply('Choose concept:', {
      reply_markup: {
        inline_keyboard: this.inlineKeyboardService.getArticleReplyButtons(),
      },
    });
  }

  async testEmail(ctx: TelegrafContext): Promise<void> {
    const regEx =
      /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

    const currentUpdate = ctx.update;
    if (!('message' in currentUpdate)) throw new Error('No message');
    if (!('text' in currentUpdate.message)) throw new Error('No message text');
    const { text } = currentUpdate.message;

    const isValidEmail = await this.inputUtilsService.validate['email'](text);
    const isValidNumber = await this.inputUtilsService.validate['number'](text);
    const isValidString = await this.inputUtilsService.validate['string'](text);

    console.log('isValidEmail', isValidEmail);
    console.log('isValidNumber', isValidNumber);
    console.log('isValidString', isValidString);
    console.log('parsed number', this.inputUtilsService.parseNumber(text));
    console.log('-----');

    if (regEx.test(text)) {
      await ctx.reply('Email is valid');
    } else {
      await ctx.reply('Email is not valid');
    }
  }

  async processCallback(ctx: TelegrafContext): Promise<void> {
    try {
      if (!('data' in ctx.callbackQuery))
        throw new Error('No data in the callback');
      const { data } = ctx.callbackQuery;

      switch (data) {
        case 'true': {
          await ctx.reply('true');
          break;
        }
        case 'false': {
          await ctx.reply('false');
          break;
        }
        default: {
          throw new Error('Unknown callback data');
        }
      }
    } catch (error) {
      this.logger.log(`test: ${ctx.update.update_id} ${error}`);
    }
  }

  async sendMessageToAdmin(
    ctx: TelegrafContext,
    message: string,
  ): Promise<void> {
    await ctx.telegram.sendMessage(this.adminId, message);
  }

  async sendPhotoToAdmin(ctx: TelegrafContext, fileId: string): Promise<void> {
    // TODO: improve error handling, probably handle in tg-bot.update.ts
    try {
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const response = await axios.get(fileLink.toString(), {
        responseType: 'arraybuffer',
      });
      await ctx.telegram.sendPhoto(this.adminId, {
        source: Buffer.from(response.data),
      });
    } catch (error) {
      this.logger.log(`sendPhotoToAdmin: ${ctx.update.update_id} ${error}`);
    }
  }

  async processPhoto(ctx: TelegrafContext): Promise<void> {
    // TODO: improve error handling, probably handle in tg-bot.update.ts
    try {
      const currentUpdate = ctx.update;
      if (!('message' in currentUpdate)) throw new Error('No message');
      if (!('photo' in currentUpdate.message)) throw new Error('No photo');
      const userId = currentUpdate.message.from.id;

      const { file_id } = currentUpdate.message.photo.at(-1);
      const fileLink = await ctx.telegram.getFileLink(file_id);

      const response = await axios.get(fileLink.toString(), {
        responseType: 'arraybuffer',
      });
      const fileName = `${this.utilsService.getCurrentUTCDateTime()}-${userId}.jpg`;

      await fs.writeFile(fileName, response.data);

      await this.sendPhotoToAdmin(ctx, file_id);
    } catch (error) {
      this.logger.log(`${ctx.update.update_id} ${error}`);
    }
  }
}
