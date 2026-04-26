import { ThrottleKeyContext, ThrottlerConfiguration, RegisteredThrottlerConfiguration } from "./types";

const DEFAULT_LIMIT = 60;
const DEFAULT_TTL_MS = 60_000;
const DEFAULT_ERROR_MESSAGE = "Too Many Requests";

const defaultKeyGenerator = (context: ThrottleKeyContext): string => {
  const request = context.request;
  if (!request) {
    return "unknown";
  }

  const forwarded = request.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    return forwarded.split(",")[0].trim();
  }

  if (typeof request.ip === "string" && request.ip.trim().length > 0) {
    return request.ip.trim();
  }

  return request.socket?.remoteAddress || "unknown";
};

const defaultConfiguration: RegisteredThrottlerConfiguration = {
  limit: DEFAULT_LIMIT,
  ttlMs: DEFAULT_TTL_MS,
  driver: "memory",
  keyGenerator: defaultKeyGenerator,
  errorMessage: DEFAULT_ERROR_MESSAGE,
};

let configuration: RegisteredThrottlerConfiguration = { ...defaultConfiguration };

export const parseTtl = (ttl: number | string): number => {
  if (typeof ttl === "number") {
    if (!Number.isFinite(ttl) || ttl <= 0) {
      throw new Error(`Throttler TTL must be a positive finite number. Received: ${ttl}`);
    }
    return Math.floor(ttl);
  }

  const normalized = ttl.trim().toLowerCase();
  const durationUnits = new Map<string, number>([
    ["ms", 1],
    ["s", 1000],
    ["m", 60_000],
    ["h", 3_600_000],
    ["d", 86_400_000],
  ]);

  const match = normalized.match(/^(\d+)\s*(ms|s|m|h|d)?$/i);
  if (!match) {
    throw new Error(`Unsupported throttler TTL '${ttl}'. Use numbers or values like 500ms, 15s, 10m, 1h.`);
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase() || "ms";
  const multiplier = durationUnits.get(unit);
  if (!multiplier) {
    throw new Error(`Unsupported throttler TTL unit '${unit}'`);
  }

  return amount * multiplier;
};

export const configureThrottler = (
  value: ThrottlerConfiguration
): RegisteredThrottlerConfiguration => {
  configuration = {
    ...configuration,
    ...(value.limit !== undefined ? { limit: value.limit } : {}),
    ...(value.ttl !== undefined ? { ttlMs: parseTtl(value.ttl) } : {}),
    ...(value.driver !== undefined ? { driver: value.driver } : {}),
    ...(value.keyGenerator !== undefined ? { keyGenerator: value.keyGenerator } : {}),
    ...(value.skipIf !== undefined ? { skipIf: value.skipIf } : {}),
    ...(value.errorMessage !== undefined ? { errorMessage: value.errorMessage } : {}),
    ...(value.redis !== undefined ? { redis: value.redis } : {}),
  };

  return getThrottlerConfiguration();
};

export const getThrottlerConfiguration = (): RegisteredThrottlerConfiguration => {
  return { ...configuration };
};

export const resetThrottlerConfiguration = (): void => {
  configuration = { ...defaultConfiguration };
};
