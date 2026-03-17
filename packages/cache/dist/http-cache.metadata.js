"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHttpCachePolicy = exports.getHttpCacheMethodPolicy = exports.getHttpCacheClassPolicy = exports.registerHttpCacheMethodPolicy = exports.registerHttpCacheClassPolicy = void 0;
require("reflect-metadata");
const http_cache_policy_1 = require("./http-cache.policy");
const HTTP_CACHE_CLASS_POLICY_KEY = Symbol("xtask:cache:http:class-policy");
const HTTP_CACHE_METHOD_POLICY_KEY = Symbol("xtask:cache:http:method-policy");
const registerHttpCacheClassPolicy = (target, policy) => {
    const existingPolicy = Reflect.getMetadata(HTTP_CACHE_CLASS_POLICY_KEY, target);
    const mergedPolicy = (0, http_cache_policy_1.mergeHttpCachePolicy)(existingPolicy, policy);
    Reflect.defineMetadata(HTTP_CACHE_CLASS_POLICY_KEY, mergedPolicy, target);
    return mergedPolicy;
};
exports.registerHttpCacheClassPolicy = registerHttpCacheClassPolicy;
const registerHttpCacheMethodPolicy = (target, handler, policy) => {
    const entries = Reflect.getMetadata(HTTP_CACHE_METHOD_POLICY_KEY, target.constructor) || [];
    const existingEntry = entries.find((entry) => entry.handler === handler);
    if (existingEntry) {
        existingEntry.policy = (0, http_cache_policy_1.mergeHttpCachePolicy)(existingEntry.policy, policy);
    }
    else {
        entries.push({
            handler,
            policy: (0, http_cache_policy_1.mergeHttpCachePolicy)({}, policy),
        });
    }
    Reflect.defineMetadata(HTTP_CACHE_METHOD_POLICY_KEY, entries, target.constructor);
    return entries.find((entry) => entry.handler === handler).policy;
};
exports.registerHttpCacheMethodPolicy = registerHttpCacheMethodPolicy;
const getHttpCacheClassPolicy = (target) => {
    const policy = Reflect.getMetadata(HTTP_CACHE_CLASS_POLICY_KEY, target);
    return policy ? (0, http_cache_policy_1.mergeHttpCachePolicy)({}, policy) : undefined;
};
exports.getHttpCacheClassPolicy = getHttpCacheClassPolicy;
const getHttpCacheMethodPolicy = (target, handler) => {
    const entries = Reflect.getMetadata(HTTP_CACHE_METHOD_POLICY_KEY, target) || [];
    const policy = entries.find((entry) => entry.handler === handler)?.policy;
    return policy ? (0, http_cache_policy_1.mergeHttpCachePolicy)({}, policy) : undefined;
};
exports.getHttpCacheMethodPolicy = getHttpCacheMethodPolicy;
const getHttpCachePolicy = (target, handler) => {
    const classPolicy = (0, exports.getHttpCacheClassPolicy)(target);
    if (handler === undefined) {
        return classPolicy;
    }
    const methodPolicy = (0, exports.getHttpCacheMethodPolicy)(target, handler);
    if (!classPolicy && !methodPolicy) {
        return undefined;
    }
    return (0, http_cache_policy_1.mergeHttpCachePolicy)(classPolicy, methodPolicy);
};
exports.getHttpCachePolicy = getHttpCachePolicy;
