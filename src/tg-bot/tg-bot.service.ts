import { Injectable, Logger } from '@nestjs/common';
import { UtilsService } from 'utils/utils.service';
import { ConfigService } from '@nestjs/config';
import { TelegrafContext } from './types';
import { promises as fs } from 'fs';
import axios from 'axios';

@Injectable()
export class TgBotService {
  private readonly logger = new Logger(TgBotService.name);
  private readonly adminId: number;
  constructor(
    private readonly utilsService: UtilsService,
    private readonly configService: ConfigService,
  ) {
    this.adminId = Number(this.configService.get<number>('TG_BOT_ADMIN_ID'));
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
