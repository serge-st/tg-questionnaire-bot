import { Scenes } from 'telegraf';
import { User } from 'telegraf/typings/core/types/typegram';

export type TelegrafContext = Scenes.SceneContext;

export interface TgUser extends User {
  userInfo?: string; // TG username or first_name + ?last_name
}

export type TelegrafContextWithUser = TelegrafContext & { user: TgUser };
