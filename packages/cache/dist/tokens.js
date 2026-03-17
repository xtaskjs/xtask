"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCacheRepositoryToken = exports.getCacheHttpServiceToken = exports.getCacheAdminServiceToken = exports.getCacheLifecycleToken = exports.getCacheServiceToken = exports.resolveCacheModelName = void 0;
const configuration_1 = require("./configuration");
const model_reference_1 = require("./model-reference");
const CACHE_SERVICE_TOKEN = "xtask:cache:service";
const CACHE_LIFECYCLE_TOKEN = "xtask:cache:lifecycle";
const CACHE_ADMIN_SERVICE_TOKEN = "xtask:cache:admin-service";
const CACHE_HTTP_SERVICE_TOKEN = "xtask:cache:http-service";
const CACHE_REPOSITORY_TOKEN_PREFIX = "xtask:cache:repository";
const resolveCacheModelName = (value) => {
    return (0, configuration_1.getRegisteredCacheModel)(value)?.name || (0, model_reference_1.resolveDeclaredCacheModelName)(value);
};
exports.resolveCacheModelName = resolveCacheModelName;
const getCacheServiceToken = () => CACHE_SERVICE_TOKEN;
exports.getCacheServiceToken = getCacheServiceToken;
const getCacheLifecycleToken = () => CACHE_LIFECYCLE_TOKEN;
exports.getCacheLifecycleToken = getCacheLifecycleToken;
const getCacheAdminServiceToken = () => CACHE_ADMIN_SERVICE_TOKEN;
exports.getCacheAdminServiceToken = getCacheAdminServiceToken;
const getCacheHttpServiceToken = () => CACHE_HTTP_SERVICE_TOKEN;
exports.getCacheHttpServiceToken = getCacheHttpServiceToken;
const getCacheRepositoryToken = (model) => {
    return `${CACHE_REPOSITORY_TOKEN_PREFIX}:${(0, exports.resolveCacheModelName)(model)}`;
};
exports.getCacheRepositoryToken = getCacheRepositoryToken;
