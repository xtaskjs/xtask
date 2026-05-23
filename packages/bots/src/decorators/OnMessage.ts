import type { BotHandlerOptions, BotPatternInput } from "../types";
import { registerBotHandlerMetadata } from "../metadata";

const resolveInput = (
  patternOrOptions?: BotPatternInput | BotHandlerOptions,
  maybeOptions: BotHandlerOptions = {}
): { pattern?: BotPatternInput; options: BotHandlerOptions } => {
  if (!patternOrOptions) {
    return { options: maybeOptions };
  }

  if (typeof patternOrOptions === "string" || patternOrOptions instanceof RegExp) {
    return {
      pattern: patternOrOptions,
      options: maybeOptions,
    };
  }

  return {
    options: patternOrOptions,
  };
};

export const OnMessage = (
  patternOrOptions?: BotPatternInput | BotHandlerOptions,
  maybeOptions: BotHandlerOptions = {}
): MethodDecorator => {
  const { pattern, options } = resolveInput(patternOrOptions, maybeOptions);

  return (target, propertyKey) => {
    registerBotHandlerMetadata(target.constructor, {
      kind: "message",
      method: propertyKey,
      pattern,
      name: options.name?.trim() || undefined,
      disabled: options.disabled === true,
    });
  };
};
