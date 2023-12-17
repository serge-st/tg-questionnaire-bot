import { MiddlewareFn } from 'telegraf';
import { TelegrafContext } from './types';

export const TgBotMiddleware: MiddlewareFn<TelegrafContext> = (ctx, next) => {
  // Your middleware logic here
  // For example, logging the user and the text of the message
  if (ctx.message) {
    console.log(`User: ${ctx.from?.id}, Message: ${ctx.message}`);
  }

  return next();
};
