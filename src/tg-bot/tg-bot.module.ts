import { Module } from '@nestjs/common';
import { TgBotUppdate } from './tg-bot.update';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { TgBotService } from './tg-bot.service';
import { UtilsModule } from 'utils/utils.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const token = configService.get<string>('TG_BOT_TOKEN');
        return { token };
      },
    }),
    UtilsModule,
    ConfigModule,
    CacheModule.register({
      ttl: 60 * 60 * 1000, // = 1h, time in milliseconds
    }),
  ],
  providers: [TgBotUppdate, TgBotService],
})
export class TgBotModule {}
