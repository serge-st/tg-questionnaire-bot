import { Logger } from '@nestjs/common';
import { Update, Ctx, Start, On, Hears } from 'nestjs-telegraf';
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

  // @On('text')
  // async test(@Ctx() ctx: TelegrafContext) {
  //   this.tgBotService.test(ctx);
  // }

  @Hears('options')
  async sendCallback(@Ctx() ctx: TelegrafContext) {
    this.tgBotService.sendCallback(ctx);
  }

  @On('callback_query')
  async testCallback(@Ctx() ctx: TelegrafContext) {
    this.tgBotService.testCallback(ctx);
  }
}
