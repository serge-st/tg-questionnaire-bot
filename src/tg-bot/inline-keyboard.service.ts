import { Injectable } from '@nestjs/common';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';
import { Option } from 'tg-bot/types';

@Injectable()
export class InlineKeyboardService {
  renderBooleanSelector(): InlineKeyboardButton[][] {
    return [[{ text: 'Yes', callback_data: 'true' }], [{ text: 'No', callback_data: 'false' }]];
  }

  renderLink(placeholder: string, url: string): InlineKeyboardButton[][] {
    return [[{ text: placeholder, url }]];
  }

  renderOptions(options: Option[]): InlineKeyboardButton[][] {
    return options.map((option) => [{ text: option.label, callback_data: option.value.toString() }]);
  }
}
