import "reflect-metadata";
import type {
  BotGatewayMetadata,
  BotGatewayOptions,
  BotHandlerMetadata,
  BotPatternInput,
} from "./types";

const BOT_GATEWAY_METADATA_KEY = "xtask:bots:gateway";
const BOT_HANDLER_METADATA_KEY = "xtask:bots:handlers";

export const normalizePlatforms = (platform?: string | string[]): string[] => {
  if (!platform) {
    return [];
  }

  const values = Array.isArray(platform) ? platform : [platform];
  return Array.from(
    new Set(
      values
        .map((entry) => String(entry || "").trim().toLowerCase())
        .filter((entry) => entry.length > 0)
    )
  );
};

export const normalizeGroups = (group?: string | string[]): string[] => {
  if (!group) {
    return [];
  }

  const values = Array.isArray(group) ? group : [group];
  return Array.from(
    new Set(
      values
        .map((entry) => String(entry || "").trim())
        .filter((entry) => entry.length > 0)
    )
  );
};

export const normalizeCommand = (value: string): string => {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error("Bot command requires a non-empty value");
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

export const stringifyPattern = (pattern?: BotPatternInput): string | undefined => {
  if (!pattern) {
    return undefined;
  }

  if (typeof pattern === "string") {
    return pattern;
  }

  return pattern.toString();
};

export const registerBotGatewayMetadata = (
  target: any,
  metadata: BotGatewayMetadata
): void => {
  Reflect.defineMetadata(BOT_GATEWAY_METADATA_KEY, metadata, target);
};

export const getBotGatewayMetadata = (target: any): BotGatewayMetadata | undefined => {
  return Reflect.getMetadata(BOT_GATEWAY_METADATA_KEY, target);
};

export const registerBotHandlerMetadata = (
  target: any,
  metadata: BotHandlerMetadata
): void => {
  const handlers = getBotHandlerMetadata(target);
  handlers.push(metadata);
  Reflect.defineMetadata(BOT_HANDLER_METADATA_KEY, handlers, target);
};

export const getBotHandlerMetadata = (target: any): BotHandlerMetadata[] => {
  return Reflect.getMetadata(BOT_HANDLER_METADATA_KEY, target) || [];
};

export const createGatewayMetadataFromOptions = (
  options: BotGatewayOptions,
  defaultPlatform?: string | string[]
): BotGatewayMetadata => {
  const platforms = normalizePlatforms(options.platform || defaultPlatform);
  if (!platforms.length) {
    throw new Error("BotGateway requires at least one platform");
  }

  return {
    name: options.name?.trim() || undefined,
    platforms,
    groups: normalizeGroups(options.group),
    disabled: options.disabled === true,
  };
};
