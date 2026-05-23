const BOTS_LIFECYCLE_TOKEN = "xtask:bots:lifecycle";
const BOTS_SERVICE_TOKEN = "xtask:bots:service";

export const getBotsLifecycleToken = (): string => BOTS_LIFECYCLE_TOKEN;

export const getBotsServiceToken = (): string => BOTS_SERVICE_TOKEN;

export const getBotAdapterToken = (platform: string): string => {
  const normalized = String(platform || "").trim().toLowerCase();
  if (!normalized) {
    throw new Error("Bot adapter token requires a non-empty platform");
  }

  return `xtask:bots:adapter:${normalized}`;
};
