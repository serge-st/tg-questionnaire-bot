import { Update, Ctx, Start, Help, On, Hears } from 'nestjs-telegraf';
import { TelegrafContext } from 'tg-bot/types';
import { TgBotService } from './tg-bot.service';
import { Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';

@Update()
export class TgBotUppdate {
  private readonly logger = new Logger(TgBotUppdate.name);
  private readonly booleanSelector: InlineKeyboardButton[][] = [
    [{ text: 'Yes ✅', callback_data: 'true' }],
    [{ text: 'No ❌', callback_data: 'false' }],
  ];
  private readonly goalSelector: InlineKeyboardButton[][] = [
    [{ text: 'Bulk 💪', callback_data: 'bulk' }],
    [{ text: 'Clean Bulk 🍏💪', callback_data: 'clean bulk' }],
    [{ text: 'Weight Cutting ⚖️', callback_data: 'cut' }],
    [{ text: 'Endurance 🏃', callback_data: 'endurance' }],
    [{ text: 'Recovery after an injury ❤️‍🩹', callback_data: 'recovery' }],
  ];

  constructor(
    private readonly tgBotService: TgBotService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Start()
  async start(@Ctx() ctx: TelegrafContext) {
    await ctx.reply('Choose a number:', {
      reply_markup: { input_field_placeholder: 'test', force_reply: true },
    });
  }

  @Hears('bool')
  async bool(@Ctx() ctx: TelegrafContext) {
    await ctx.reply('This is my first cycle:', {
      reply_markup: { inline_keyboard: this.booleanSelector },
    });
  }

  @Hears('goal')
  async options(@Ctx() ctx: TelegrafContext) {
    await ctx.reply('Choose your goal:', {
      reply_markup: { inline_keyboard: this.goalSelector },
    });
  }

  @On('callback_query')
  async test(@Ctx() ctx: TelegrafContext) {
    try {
      if (!('data' in ctx.callbackQuery)) throw new Error('No message');
      console.log(ctx.callbackQuery.data);
      await ctx.reply(`You pressed ${ctx.callbackQuery.data}`);
    } catch (error) {
      this.logger.log(`test: ${ctx.update.update_id} ${error}`);
    }
  }

  @Help()
  async help(@Ctx() ctx: TelegrafContext) {
    await ctx.reply('Send me a sticker');
  }

  // * Number parser
  //parseFloat(' 1 , 11 '.replaceAll(' ', '').replace(',', '.'))

  @On('text')
  async onEmoji(@Ctx() ctx: TelegrafContext): Promise<void> {
    const currentUpdate = ctx.update;
    if (!('message' in currentUpdate)) throw new Error('No message');
    if (!('from' in currentUpdate.message)) throw new Error('No sender');
    if (!('text' in currentUpdate.message)) throw new Error('No message text');
    const { from, text } = currentUpdate.message;
    this.logger.log('current message', currentUpdate.message);

    const previousReply = await this.cacheManager.get(from.id.toString());

    if (previousReply) {
      this.logger.log('previous reply', previousReply);
    }
    await this.cacheManager.set(from.id.toString(), text);
    // await ctx.telegram.sendMessage(261516520, 'yoba');
    await ctx.reply('Текс получен');
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

// private readonly numpad: InlineKeyboardButton[][] = [
//   [
//     { text: '1', callback_data: '1' },
//     { text: '2', callback_data: '2' },
//     { text: '3', callback_data: '3' },
//   ],
//   [
//     { text: '4', callback_data: '4' },
//     { text: '5', callback_data: '5' },
//     { text: '6', callback_data: '6' },
//   ],
//   [
//     { text: '7', callback_data: '7' },
//     { text: '8', callback_data: '8' },
//     { text: '9', callback_data: '9' },
//   ],
//   [
//     { text: '.', callback_data: '.' },
//     { text: '0', callback_data: '0' },
//     { text: 'Submit', callback_data: 'Submit' },
//   ],
// ];
