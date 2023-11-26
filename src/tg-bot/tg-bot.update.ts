import { Update, Ctx, Start, Help, On, Hears } from 'nestjs-telegraf';
import { TelegrafContext } from 'tg-bot/types';
import { TgBotService } from './tg-bot.service';
import { Logger } from '@nestjs/common';

@Update()
export class TgBotUppdate {
  private readonly logger = new Logger(TgBotUppdate.name);
  constructor(private readonly tgBotService: TgBotService) {}

  @Start()
  async start(@Ctx() ctx: TelegrafContext) {
    this.logger.log('-------');
    this.logger.log('start', JSON.stringify(ctx.update, null, 2));
    const userInfo = JSON.stringify(ctx.update, null, 2);
    this.tgBotService.getHello();
    await ctx.reply(`Welcome 👷🏻 ${userInfo}`);
  }

  @Help()
  async help(@Ctx() ctx: TelegrafContext) {
    await ctx.reply('Send me a sticker');
  }

  @On('sticker')
  async on(@Ctx() ctx: TelegrafContext) {
    await ctx.reply('👍');
  }

  @Hears('hi')
  async hears(@Ctx() ctx: TelegrafContext) {
    await ctx.reply('Hey there');
  }
}
