import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from '../config/configuration';
import { TgBotModule } from 'tg-bot/tg-bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    TgBotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
