import { Update, Ctx, Start, Help, On, Hears } from 'nestjs-telegraf';
import { TelegrafContext } from 'tg-bot/types';
import { TgBotService } from './tg-bot.service';
import { Logger } from '@nestjs/common';
import { promises as fs } from 'fs';

@Update()
export class TgBotUppdate {
  private readonly logger = new Logger(TgBotUppdate.name);
  constructor(private readonly tgBotService: TgBotService) {}

  @Start()
  async start(@Ctx() ctx: TelegrafContext) {
    this.logger.log('-------');
    this.logger.log('start', JSON.stringify(ctx.update, null, 2));
    const userInfo = JSON.stringify(ctx.update, null, 2);
    await fs.writeFile(
      'message-data-example.json',
      JSON.stringify(ctx, null, 2),
    );
    await ctx.reply(`Welcome 👷🏻 ${userInfo}`);
  }

  @Help()
  async help(@Ctx() ctx: TelegrafContext) {
    await ctx.reply('Send me a sticker');
  }

  @On('photo')
  async onPhoto(@Ctx() ctx: TelegrafContext): Promise<void> {
    await this.tgBotService.processPhoto(ctx);
    await ctx.reply('👍');
  }

  @Hears('hi')
  async hears(@Ctx() ctx: TelegrafContext) {
    await ctx.reply('Hey there');
  }
}
