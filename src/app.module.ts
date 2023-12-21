import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '../config/configuration';
import { TgBotModule } from 'tg-bot/tg-bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    TgBotModule,
  ],
})
export class AppModule {}
