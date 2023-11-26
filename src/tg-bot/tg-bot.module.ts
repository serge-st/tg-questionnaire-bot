import { Logger, Module } from '@nestjs/common';
import { TgBotUppdate } from './tg-bot.update';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { TgBotService } from './tg-bot.service';
import { UtilsModule } from 'utils/utils.module';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const botToken = configService.get<string>('TG_BOT_TOKEN');
        Logger.log(`Bot Token Length: ${botToken.length}`, 'TelegrafSetup');
        return {
          token: botToken,
          telegrafOptions: {
            debug: true,
          },
        };
      },
    }),
    UtilsModule,
  ],
  providers: [TgBotUppdate, TgBotService],
})
export class TgBotModule {}
