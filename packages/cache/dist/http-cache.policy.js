"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectHttpCachePolicy = exports.mergeHttpCachePolicy = exports.normalizeHttpCacheVary = void 0;
const configuration_1 = require("./configuration");
const normalizeHttpCacheVary = (value) => {
    if (!value) {
        return undefined;
    }
    const normalized = Array.from(new Set((Array.isArray(value) ? value : [value])
        .flatMap((entry) => String(entry).split(","))
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)));
    return normalized.length > 0 ? normalized : undefined;
};
exports.normalizeHttpCacheVary = normalizeHttpCacheVary;
const mergeHttpCachePolicy = (existingPolicy = {}, nextPolicy = {}) => {
    return {
        ...existingPolicy,
        ...nextPolicy,
        vary: (0, exports.normalizeHttpCacheVary)([
            ...((0, exports.normalizeHttpCacheVary)(existingPolicy.vary) || []),
            ...((0, exports.normalizeHttpCacheVary)(nextPolicy.vary) || []),
        ]),
    };
};
exports.mergeHttpCachePolicy = mergeHttpCachePolicy;
const inspectHttpCachePolicy = (policy = {}) => {
    return {
        visibility: policy.visibility,
        maxAgeMs: (0, configuration_1.parseCacheDuration)(policy.maxAge),
        sharedMaxAgeMs: (0, configuration_1.parseCacheDuration)(policy.sharedMaxAge),
        staleWhileRevalidateMs: (0, configuration_1.parseCacheDuration)(policy.staleWhileRevalidate),
        staleIfErrorMs: (0, configuration_1.parseCacheDuration)(policy.staleIfError),
        immutable: policy.immutable === true,
        noStore: policy.noStore === true,
        noCache: policy.noCache === true,
        mustRevalidate: policy.mustRevalidate === true,
        proxyRevalidate: policy.proxyRevalidate === true,
        vary: (0, exports.normalizeHttpCacheVary)(policy.vary) || [],
        viewsOnly: policy.viewsOnly === true,
    };
};
exports.inspectHttpCachePolicy = inspectHttpCachePolicy;
