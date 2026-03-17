import { getRegisteredCacheModel } from "./configuration";
import { resolveDeclaredCacheModelName } from "./model-reference";
import { CacheModelReference } from "./types";

const CACHE_SERVICE_TOKEN = "xtask:cache:service";
const CACHE_LIFECYCLE_TOKEN = "xtask:cache:lifecycle";
const CACHE_ADMIN_SERVICE_TOKEN = "xtask:cache:admin-service";
const CACHE_HTTP_SERVICE_TOKEN = "xtask:cache:http-service";
const CACHE_REPOSITORY_TOKEN_PREFIX = "xtask:cache:repository";

export const resolveCacheModelName = (value: CacheModelReference): string => {
  return getRegisteredCacheModel(value)?.name || resolveDeclaredCacheModelName(value);
};

export const getCacheServiceToken = (): string => CACHE_SERVICE_TOKEN;

export const getCacheLifecycleToken = (): string => CACHE_LIFECYCLE_TOKEN;

export const getCacheAdminServiceToken = (): string => CACHE_ADMIN_SERVICE_TOKEN;

export const getCacheHttpServiceToken = (): string => CACHE_HTTP_SERVICE_TOKEN;

export const getCacheRepositoryToken = (model: CacheModelReference): string => {
  return `${CACHE_REPOSITORY_TOKEN_PREFIX}:${resolveCacheModelName(model)}`;
};