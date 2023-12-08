import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { TgBotUppdate } from './tg-bot.update';
import { TgBotService } from './tg-bot.service';
import { InlineKeyboardService } from './inline-keyboard.service';
import { UtilsService } from './utils.service';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      botName: 'tg-bot',
      useFactory: async (configService: ConfigService) => {
        const token = configService.get<string>('TG_BOT_TOKEN');
        return { token };
      },
    }),
    ConfigModule,
    CacheModule.register({
      ttl: 60 * 60 * 1000, // = 1h, time in milliseconds
    }),
  ],
  providers: [TgBotUppdate, TgBotService, InlineKeyboardService, UtilsService],
})
export class TgBotModule {}
