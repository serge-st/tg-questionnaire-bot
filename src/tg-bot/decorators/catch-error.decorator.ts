import { Logger } from '@nestjs/common';

export function CatchError(getErrorText: (instance: any) => string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        await originalMethod.apply(this, args);
      } catch (error) {
        const logger = new Logger(target.constructor.name);
        logger.error(`${propertyKey}`, error);

        const ctx = args[0];
        if (ctx && ctx.reply) {
          await ctx.reply(getErrorText(this));
        }
      }
    };

    return descriptor;
  };
}
