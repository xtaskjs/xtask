import type { BotHandlerOptions } from "../types";
import { normalizeCommand, registerBotHandlerMetadata } from "../metadata";

export const OnCommand = (command: string, options: BotHandlerOptions = {}): MethodDecorator => {
  const normalizedCommand = normalizeCommand(command);

  return (target, propertyKey) => {
    registerBotHandlerMetadata(target.constructor, {
      kind: "command",
      method: propertyKey,
      command: normalizedCommand,
      name: options.name?.trim() || undefined,
      disabled: options.disabled === true,
    });
  };
};
