import {
  CacheConfiguration,
  CacheModelOptions,
  CacheModelReference,
  CacheTtlInput,
  HttpCachePolicyOptions,
  RegisteredCacheConfiguration,
  RegisteredCacheModelOptions,
} from "./types";
import { mergeHttpCachePolicy } from "./http-cache.policy";
import { resolveDeclaredCacheModelName } from "./model-reference";

const CACHE_DURATION_UNITS = new Map<string, number>([
  ["ms", 1],
  ["s", 1000],
  ["m", 60 * 1000],
  ["h", 60 * 60 * 1000],
  ["d", 24 * 60 * 60 * 1000],
  ["w", 7 * 24 * 60 * 60 * 1000],
]);

const defaultConfiguration = (): RegisteredCacheConfiguration => ({
  defaultDriver: "memory",
  namespace: "xtask:cache",
  connectOnStart: true,
  failOnDuplicateModels: true,
});

let configuration = defaultConfiguration();
const registeredModels = new Map<string, RegisteredCacheModelOptions>();

const normalizeNamespace = (value?: string): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : undefined;
};

export const parseCacheDuration = (value?: CacheTtlInput): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Cache duration must be a non-negative finite number. Received: ${value}`);
    }
    return Math.floor(value);
  }

  const normalizedValue = value.trim().toLowerCase();
  const match = normalizedValue.match(/^(\d+)\s*(ms|s|m|h|d|w)?$/i);
  if (!match) {
    throw new Error(
      `Unsupported cache duration '${value}'. Use numbers or values like 500ms, 15s, 10m, 1h.`
    );
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase() || "ms";
  const multiplier = CACHE_DURATION_UNITS.get(unit);
  if (!multiplier) {
    throw new Error(`Unsupported cache duration unit '${unit}'`);
  }

  return amount * multiplier;
};

export const configureCache = (value: CacheConfiguration): RegisteredCacheConfiguration => {
  configuration = {
    ...configuration,
    ...value,
    namespace: normalizeNamespace(value.namespace) || configuration.namespace,
    defaultDriver: value.defaultDriver || configuration.defaultDriver,
    defaultTtlMs: value.defaultTtl !== undefined ? parseCacheDuration(value.defaultTtl) : configuration.defaultTtlMs,
    connectOnStart: value.connectOnStart ?? configuration.connectOnStart,
    failOnDuplicateModels: value.failOnDuplicateModels ?? configuration.failOnDuplicateModels,
    httpCacheDefaults: value.httpCacheDefaults
      ? mergeHttpCachePolicy(configuration.httpCacheDefaults, value.httpCacheDefaults)
      : configuration.httpCacheDefaults,
    redis: value.redis ? { ...(configuration.redis || {}), ...value.redis } : configuration.redis,
  };

  return getCacheConfiguration();
};

export const getCacheConfiguration = (): RegisteredCacheConfiguration => {
  return {
    ...configuration,
    httpCacheDefaults: configuration.httpCacheDefaults
      ? mergeHttpCachePolicy({}, configuration.httpCacheDefaults)
      : undefined,
    redis: configuration.redis ? { ...configuration.redis } : undefined,
  };
};

export const getConfiguredHttpCacheDefaults = (): CacheConfiguration["httpCacheDefaults"] => {
  const currentConfiguration = getCacheConfiguration();
  return currentConfiguration.httpCacheDefaults
    ? mergeHttpCachePolicy({}, currentConfiguration.httpCacheDefaults)
    : undefined;
};

export const resolveHttpCachePolicy = <T = any>(
  policy: HttpCachePolicyOptions<T> = {}
): HttpCachePolicyOptions<T> => {
  return mergeHttpCachePolicy(getConfiguredHttpCacheDefaults(), policy);
};

export const clearCacheConfiguration = (): void => {
  configuration = defaultConfiguration();
};

export const registerCacheModel = <T = any>(
  model: CacheModelReference<T>,
  options: CacheModelOptions<T> = {}
): RegisteredCacheModelOptions<T> => {
  const name = options.name?.trim() || resolveDeclaredCacheModelName(model);
  if (!name) {
    throw new Error("Cache model requires a non-empty name");
  }

  const existingDefinition = registeredModels.get(name);
  if (existingDefinition && getCacheConfiguration().failOnDuplicateModels) {
    throw new Error(`Cache model '${name}' is already registered`);
  }

  const normalizedNamespace = normalizeNamespace(options.namespace) || configuration.namespace;
  const definition: RegisteredCacheModelOptions<T> = {
    name,
    driver: options.driver || configuration.defaultDriver,
    ttlMs: options.ttl !== undefined ? parseCacheDuration(options.ttl) : configuration.defaultTtlMs,
    namespace: normalizedNamespace || defaultConfiguration().namespace,
    prefix: options.prefix?.trim() || name,
    store: options.store,
    serialize: options.serialize,
    deserialize: options.deserialize,
    redis: options.redis ? { ...options.redis } : undefined,
    reference: model,
  };

  registeredModels.set(name, definition);
  return { ...definition };
};

export const getRegisteredCacheModels = (): RegisteredCacheModelOptions[] => {
  return Array.from(registeredModels.values()).map((definition) => ({
    ...definition,
    redis: definition.redis ? { ...definition.redis } : undefined,
  }));
};

export const getRegisteredCacheModel = <T = any>(
  model: CacheModelReference<T>
): RegisteredCacheModelOptions<T> | undefined => {
  const definition = typeof model === "string"
    ? registeredModels.get(resolveDeclaredCacheModelName(model))
    : getRegisteredCacheModels().find((candidate) => candidate.reference === model)
      || registeredModels.get(resolveDeclaredCacheModelName(model));
  if (!definition) {
    return undefined;
  }

  return {
    ...(definition as RegisteredCacheModelOptions<T>),
    redis: definition.redis ? { ...definition.redis } : undefined,
  };
};

export const clearRegisteredCacheModels = (): void => {
  registeredModels.clear();
};

export const resetCacheConfiguration = (): void => {
  clearCacheConfiguration();
  clearRegisteredCacheModels();
};