import { Injectable } from '@nestjs/common';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';
import { Option } from './fit-questionnaire';

@Injectable()
export class InlineKeyboardService {
  getBooleanSelector(): InlineKeyboardButton[][] {
    return [[{ text: 'Yes', callback_data: 'true' }], [{ text: 'No', callback_data: 'false' }]];
  }

  getGoalSelector(): InlineKeyboardButton[][] {
    return [
      [{ text: 'Bulk', callback_data: 'bulk' }],
      [{ text: 'Clean Bulk', callback_data: 'clean bulk' }],
      [{ text: 'Weight Cutting', callback_data: 'cut' }],
      [{ text: 'Endurance', callback_data: 'endurance' }],
      [{ text: 'Recovery after an injury', callback_data: 'recovery' }],
    ];
  }

  getArticleLink(): InlineKeyboardButton[][] {
    return [
      [
        {
          text: 'Link to the article',
          url: 'https://telegra.ph/THREE-CONCEPTS-ON-WHAT-THE-FIRST-CYCLE-OF-STEROIDS-SHOULD-BE-11-28',
        },
      ],
    ];
  }

  renderLink(placeholder: string, url: string): InlineKeyboardButton[][] {
    return [[{ text: placeholder, url }]];
  }

  getArticleReplyButtons(): InlineKeyboardButton[][] {
    return [
      [{ text: 'Concept of minimalism', callback_data: 'minimalism' }],
      [{ text: 'Hardcore', callback_data: 'hardcore' }],
      [{ text: 'Something in between', callback_data: 'average' }],
    ];
  }

  renderOptions(options: Option[]): InlineKeyboardButton[][] {
    return options.map((option) => [{ text: option.label, callback_data: option.value.toString() }]);
  }
}
