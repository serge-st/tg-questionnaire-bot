import { Logger } from '@nestjs/common';
import { Update, Ctx, Start, On } from 'nestjs-telegraf';
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

  @On('text')
  async handleText(@Ctx() ctx: TelegrafContext) {
    this.tgBotService.checkAnswer(ctx);
  }

  @On('callback_query')
  async handleCallback(@Ctx() ctx: TelegrafContext) {
    this.tgBotService.checkOptionsAnswer(ctx);
  }
}
