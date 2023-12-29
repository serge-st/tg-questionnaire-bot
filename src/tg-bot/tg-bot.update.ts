import { Update, Ctx, Start, On, Help, Hears } from 'nestjs-telegraf';
import { TelegrafContextWithUser } from 'tg-bot/types';
import { TgBotService } from './tg-bot.service';

@Update()
export class TgBotUppdate {
  constructor(private readonly tgBotService: TgBotService) {}

  @Start()
  async start(@Ctx() ctx: TelegrafContextWithUser) {
    console.log('start');
    await this.tgBotService.start(ctx);
  }

  @Help()
  async help(@Ctx() ctx: TelegrafContextWithUser) {
    await this.tgBotService.help(ctx);
  }

  @Hears('/restart')
  async restart(@Ctx() ctx: TelegrafContextWithUser) {
    await this.tgBotService.restart(ctx);
  }

  @Hears('/edit_last_reply')
  async editLastReply(@Ctx() ctx: TelegrafContextWithUser) {
    await this.tgBotService.editLastReply(ctx);
  }

  @On('photo')
  async handlePhoto(@Ctx() ctx: TelegrafContextWithUser) {
    await this.tgBotService.checkPhotoAnswer(ctx);
  }

  @On('text')
  async handleText(@Ctx() ctx: TelegrafContextWithUser) {
    await this.tgBotService.checkAnswer(ctx);
  }

  @On('callback_query')
  async handleCallback(@Ctx() ctx: TelegrafContextWithUser) {
    await this.tgBotService.checkOptionsAnswer(ctx);
  }
}
