import type { BotGatewayOptions } from "../types";
import { createGatewayMetadataFromOptions, registerBotGatewayMetadata } from "../metadata";

export const BotGateway = (
  platformOrOptions: string | string[] | BotGatewayOptions,
  options: BotGatewayOptions = {}
): ClassDecorator => {
  return (target: any) => {
    if (typeof platformOrOptions === "string" || Array.isArray(platformOrOptions)) {
      registerBotGatewayMetadata(
        target,
        createGatewayMetadataFromOptions(options, platformOrOptions)
      );
      return;
    }

    registerBotGatewayMetadata(target, createGatewayMetadataFromOptions(platformOrOptions));
  };
};
