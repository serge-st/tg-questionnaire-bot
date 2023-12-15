import { Logger } from '@nestjs/common';
import { Update, Ctx, Start, On, Help, Hears } from 'nestjs-telegraf';
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

  @Help()
  async help(@Ctx() ctx: TelegrafContext) {
    await this.tgBotService.help(ctx);
  }

  @Hears('/restart')
  async restart(@Ctx() ctx: TelegrafContext) {
    await this.tgBotService.restart(ctx);
  }

  // TODO: add command to edit the last reply
  // @Hears('/edit_last_reply')

  @On('photo')
  async handlePhoto(@Ctx() ctx: TelegrafContext) {
    await this.tgBotService.checkAnswer(ctx);
  }

  @On('text')
  async handleText(@Ctx() ctx: TelegrafContext) {
    await this.tgBotService.checkAnswer(ctx);
  }

  @On('callback_query')
  async handleCallback(@Ctx() ctx: TelegrafContext) {
    await this.tgBotService.checkOptionsAnswer(ctx);
  }
}
