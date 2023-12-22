import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheService } from 'tg-bot/cache';
import { InlineKeyboardService, MessagingService } from 'tg-bot/messaging';
import { ValidationService } from 'tg-bot/validation';
import { AddUserInfoToContextMiddleware } from 'tg-bot/middlewares';
import { QuestionnaireService } from 'tg-bot/questionnaire/';
import { TgBotUppdate } from './tg-bot.update';
import { TgBotService } from './tg-bot.service';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      botName: 'tg-bot',
      useFactory: async (configService: ConfigService) => {
        const token = configService.get<string>('TG_BOT_TOKEN');
        return { token, middlewares: [AddUserInfoToContextMiddleware] };
      },
    }),
    ConfigModule,
    CacheModule.register({
      ttl: 60 * 60 * 1000, // = 1h, time in milliseconds
    }),
  ],
  providers: [
    TgBotUppdate,
    TgBotService,
    InlineKeyboardService,
    ValidationService,
    QuestionnaireService,
    CacheService,
    MessagingService,
  ],
})
export class TgBotModule {}
