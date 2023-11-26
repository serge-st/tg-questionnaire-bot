import { Injectable, Logger } from '@nestjs/common';
import { UtilsService } from 'utils/utils.service';
import { TelegrafContext } from './types';
import { promises as fs } from 'fs';
import axios from 'axios';

@Injectable()
export class TgBotService {
  private readonly logger = new Logger(TgBotService.name);
  constructor(private readonly utilsService: UtilsService) {}

  async processPhoto(ctx: TelegrafContext) {
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
    } catch (error) {
      this.logger.log(`${ctx.update.update_id} ${error}`);
    }
  }
}
