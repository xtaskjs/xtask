"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaryBy = exports.NoCache = exports.NoStore = exports.CacheView = exports.CacheHeaders = exports.BrowserCache = exports.CacheResponse = void 0;
const common_1 = require("@xtaskjs/common");
const http_cache_service_1 = require("./http-cache.service");
const http_cache_metadata_1 = require("./http-cache.metadata");
const configuration_1 = require("./configuration");
const createHttpCacheMiddleware = (resolvePolicy) => {
    return async (context, next) => {
        const result = await next();
        const handled = await (0, http_cache_service_1.getHttpCacheService)().handleResponse(context, result, (0, configuration_1.resolveHttpCachePolicy)(resolvePolicy()));
        return handled.result;
    };
};
const CacheResponse = (policy = {}) => {
    return (target, propertyKey, descriptor) => {
        if (propertyKey === undefined) {
            (0, http_cache_metadata_1.registerHttpCacheClassPolicy)(target, policy);
            const middlewareDecorator = (0, common_1.UseMiddlewares)(createHttpCacheMiddleware(() => (0, http_cache_metadata_1.getHttpCachePolicy)(target) || policy));
            middlewareDecorator(target);
            return;
        }
        (0, http_cache_metadata_1.registerHttpCacheMethodPolicy)(target, propertyKey, policy);
        const middlewareDecorator = (0, common_1.UseMiddlewares)(createHttpCacheMiddleware(() => (0, http_cache_metadata_1.getHttpCachePolicy)(target.constructor, propertyKey) || policy));
        middlewareDecorator(target, propertyKey, descriptor);
    };
};
exports.CacheResponse = CacheResponse;
exports.BrowserCache = exports.CacheResponse;
exports.CacheHeaders = exports.CacheResponse;
const CacheView = (policy = {}) => {
    return (0, exports.CacheResponse)({
        ...policy,
        viewsOnly: true,
    });
};
exports.CacheView = CacheView;
const NoStore = () => {
    return (0, exports.CacheResponse)({
        noStore: true,
        noCache: true,
        mustRevalidate: true,
        etag: false,
        expiresAt: new Date(0),
    });
};
exports.NoStore = NoStore;
const NoCache = () => {
    return (0, exports.CacheResponse)({
        noCache: true,
        mustRevalidate: true,
        maxAge: 0,
        etag: false,
        expiresAt: new Date(0),
    });
};
exports.NoCache = NoCache;
const VaryBy = (...headers) => {
    return (0, exports.CacheResponse)({
        vary: headers,
    });
};
exports.VaryBy = VaryBy;
