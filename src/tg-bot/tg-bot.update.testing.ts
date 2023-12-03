import { Logger } from '@nestjs/common';
import { Update, Ctx, Start, Help, On, Hears } from 'nestjs-telegraf';
import { TelegrafContext } from 'tg-bot/types';
import { TgBotServiceTesting } from './tg-bot.service.testing';

@Update()
export class TgBotUppdateTesting {
  private readonly logger = new Logger(TgBotUppdateTesting.name);

  constructor(private readonly tgBotService: TgBotServiceTesting) {}

  @On('text')
  async onText(@Ctx() ctx: TelegrafContext) {
    this.tgBotService.testCache(ctx);
  }

  @Start()
  async start(@Ctx() ctx: TelegrafContext) {
    await ctx.reply('Choose a number:', {
      reply_markup: { input_field_placeholder: 'test', force_reply: true },
    });
  }

  @Hears('testing')
  async testing(@Ctx() ctx: TelegrafContext) {
    this.tgBotService.sendTestingMessage(ctx);
  }

  @Hears('bool')
  async bool(@Ctx() ctx: TelegrafContext) {
    this.tgBotService.testBool(ctx);
  }

  @Hears('goal')
  async options(@Ctx() ctx: TelegrafContext) {
    this.tgBotService.testGoal(ctx);
  }

  @Hears('article')
  async article(@Ctx() ctx: TelegrafContext) {
    this.tgBotService.testArticle(ctx);
  }

  @On('text')
  async email(@Ctx() ctx: TelegrafContext) {
    this.tgBotService.testEmail(ctx);
  }

  @On('callback_query')
  async test(@Ctx() ctx: TelegrafContext) {
    this.tgBotService.processCallback(ctx);
  }

  @Help()
  async help(@Ctx() ctx: TelegrafContext) {
    await ctx.reply('Send me a sticker');
  }

  // @On('text')
  // async onEmoji(@Ctx() ctx: TelegrafContext): Promise<void> {
  //   const currentUpdate = ctx.update;
  //   if (!('message' in currentUpdate)) throw new Error('No message');
  //   if (!('from' in currentUpdate.message)) throw new Error('No sender');
  //   if (!('text' in currentUpdate.message)) throw new Error('No message text');
  //   const { from, text } = currentUpdate.message;
  //   this.logger.log('current message', currentUpdate.message);

  //   // const previousReply = await this.cacheManager.get(from.id.toString());

  //   if (previousReply) {
  //     this.logger.log('previous reply', previousReply);
  //   }
  //   // await this.cacheManager.set(from.id.toString(), text);
  //   // await ctx.telegram.sendMessage(261516520, 'yoba');
  //   await ctx.reply('Текс получен');
  // }

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