import type { BotHandlerOptions, BotPatternInput } from "../types";
import { registerBotHandlerMetadata } from "../metadata";

export const OnCallbackQuery = (
  patternOrOptions?: BotPatternInput | BotHandlerOptions,
  maybeOptions: BotHandlerOptions = {}
): MethodDecorator => {
  let pattern: BotPatternInput | undefined;
  let options = maybeOptions;

  if (patternOrOptions) {
    if (typeof patternOrOptions === "string" || patternOrOptions instanceof RegExp) {
      pattern = patternOrOptions;
    } else {
      options = patternOrOptions;
    }
  }

  return (target, propertyKey) => {
    registerBotHandlerMetadata(target.constructor, {
      kind: "callback",
      method: propertyKey,
      pattern,
      name: options.name?.trim() || undefined,
      disabled: options.disabled === true,
    });
  };
};

export const OnCallback = OnCallbackQuery;
