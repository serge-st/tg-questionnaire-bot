import { MiddlewareFn } from 'telegraf';
import { User } from 'telegraf/typings/core/types/typegram';
import { TelegrafContext } from '../types';

interface TgUser extends User {
  userInfo?: string; // TG username or first_name
}

export type TelegrafContextWithUser = TelegrafContext & { user: TgUser };

export const AddUserInfoToContextMiddleware: MiddlewareFn<TelegrafContext> = (
  ctx: TelegrafContextWithUser,
  next: () => Promise<void>,
) => {
  if ('message' in ctx.update) {
    ctx.user = ctx.update.message.from;
  } else if ('callback_query' in ctx.update) {
    ctx.user = ctx.update.callback_query.from;
  }

  if (!ctx.user) return next();
  if (ctx.user.username) {
    ctx.user.userInfo = '@' + ctx.user.username;
  } else {
    ctx.user.userInfo = ctx.user.first_name;
    if (ctx.user.last_name) {
      ctx.user.userInfo += ' ' + ctx.user.last_name;
    }
  }

  return next();
};
