import { Logger } from '@nestjs/common';
import { Update, Ctx, Start } from 'nestjs-telegraf';
import { TelegrafContext } from 'tg-bot/types';
import { TgBotService } from './tg-bot.service';

@Update()
export class TgBotUppdate {
  private readonly logger = new Logger(TgBotUppdate.name);
  constructor(private readonly tgBotService: TgBotService) {}

  @Start()
  async start(@Ctx() ctx: TelegrafContext) {
    await this.tgBotService.start(ctx);
  }
}
