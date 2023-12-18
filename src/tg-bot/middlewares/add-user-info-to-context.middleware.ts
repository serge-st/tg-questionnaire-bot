import { MiddlewareFn } from 'telegraf';
import { TelegrafContext, TelegrafContextWithUser } from 'tg-bot/types';

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
