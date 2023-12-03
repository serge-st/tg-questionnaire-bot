import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import axios from 'axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TelegrafContext } from './types';
import { InlineKeyboardService } from './inline-keyboard.service';
import { InputUtilsService } from './input-utils.service';

@Injectable()
export class TgBotService {
  private readonly logger = new Logger(TgBotService.name);
  private readonly adminId: number;
  constructor(
    private readonly configService: ConfigService,
    private readonly inlineKeyboardService: InlineKeyboardService,
    private readonly inputUtilsService: InputUtilsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.adminId = Number(this.configService.get<number>('TG_BOT_ADMIN_ID'));
  }

  async start(ctx: TelegrafContext): Promise<void> {
    await ctx.reply('let us start1');
  }
}
