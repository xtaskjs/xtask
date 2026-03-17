"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHttpCacheService = exports.getBaseHttpCacheService = exports.HttpCacheService = void 0;
const crypto_1 = require("crypto");
const core_1 = require("@xtaskjs/core");
const configuration_1 = require("./configuration");
const http_cache_policy_1 = require("./http-cache.policy");
const tokens_1 = require("./tokens");
const isViewResult = (value) => {
    return value?.__xtaskView === true && typeof value?.template === "string";
};
const normalizeList = (value) => {
    if (!value) {
        return [];
    }
    return Array.from(new Set((Array.isArray(value) ? value : [value])
        .flatMap((entry) => String(entry).split(","))
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .map((entry) => entry.toLowerCase())));
};
const toBoolean = (value) => value === true;
const mergeCacheControlValues = (existingValue, nextValue) => {
    const directives = new Map();
    for (const segment of [existingValue, nextValue].filter((value) => Boolean(value))) {
        for (const directive of segment.split(",").map((entry) => entry.trim()).filter(Boolean)) {
            const [name, rawValue] = directive.split("=");
            const normalizedName = name.trim().toLowerCase();
            directives.set(normalizedName, rawValue === undefined ? true : rawValue.trim());
        }
    }
    const orderedNames = [
        "public",
        "private",
        "max-age",
        "s-maxage",
        "stale-while-revalidate",
        "stale-if-error",
        "no-store",
        "no-cache",
        "must-revalidate",
        "proxy-revalidate",
        "immutable",
    ];
    const rendered = [];
    for (const name of orderedNames) {
        if (!directives.has(name)) {
            continue;
        }
        const value = directives.get(name);
        rendered.push(value === true ? name : `${name}=${value}`);
        directives.delete(name);
    }
    for (const [name, value] of Array.from(directives.entries()).sort(([left], [right]) => left.localeCompare(right))) {
        rendered.push(value === true ? name : `${name}=${value}`);
    }
    return rendered.join(", ");
};
const sortValue = (value) => {
    if (Array.isArray(value)) {
        return value.map((entry) => sortValue(entry));
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (value && typeof value === "object") {
        return Object.keys(value)
            .sort()
            .reduce((accumulator, key) => {
            accumulator[key] = sortValue(value[key]);
            return accumulator;
        }, {});
    }
    if (typeof value === "bigint") {
        return value.toString();
    }
    return value;
};
const getHeader = (request, name) => {
    const headers = request?.headers;
    if (!headers || typeof headers !== "object") {
        return undefined;
    }
    const normalizedName = name.toLowerCase();
    for (const [headerName, value] of Object.entries(headers)) {
        if (headerName.toLowerCase() !== normalizedName) {
            continue;
        }
        if (Array.isArray(value)) {
            return value.join(", ");
        }
        return value === undefined || value === null ? undefined : String(value);
    }
    return undefined;
};
const stripWeakPrefix = (value) => value.replace(/^W\//, "").trim();
const resolveStatusCode = (context, result) => {
    if (typeof result?.statusCode === "number") {
        return result.statusCode;
    }
    if (typeof context.response?.statusCode === "number") {
        return context.response.statusCode;
    }
    return undefined;
};
const defaultEtagPayload = (result) => {
    if (isViewResult(result)) {
        return {
            template: result.template,
            model: result.model || {},
            statusCode: result.statusCode,
        };
    }
    return result;
};
class HttpCacheService {
    buildCacheControl(policy = {}) {
        const directives = [];
        const noStore = policy.noStore === true;
        if (!noStore && policy.visibility) {
            directives.push(policy.visibility);
        }
        const maxAge = noStore ? undefined : this.toCacheSeconds(policy.maxAge);
        if (maxAge !== undefined) {
            directives.push(`max-age=${maxAge}`);
        }
        const sharedMaxAge = noStore ? undefined : this.toCacheSeconds(policy.sharedMaxAge);
        if (sharedMaxAge !== undefined) {
            directives.push(`s-maxage=${sharedMaxAge}`);
        }
        const staleWhileRevalidate = noStore ? undefined : this.toCacheSeconds(policy.staleWhileRevalidate);
        if (staleWhileRevalidate !== undefined) {
            directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
        }
        const staleIfError = noStore ? undefined : this.toCacheSeconds(policy.staleIfError);
        if (staleIfError !== undefined) {
            directives.push(`stale-if-error=${staleIfError}`);
        }
        if (noStore) {
            directives.push("no-store");
        }
        if (policy.noCache) {
            directives.push("no-cache");
        }
        if (policy.mustRevalidate) {
            directives.push("must-revalidate");
        }
        if (policy.proxyRevalidate) {
            directives.push("proxy-revalidate");
        }
        if (!noStore && policy.immutable) {
            directives.push("immutable");
        }
        if (!directives.length) {
            return undefined;
        }
        return directives.join(", ");
    }
    async handleResponse(context, result, policy) {
        if (!this.shouldApplyPolicy(context, result, policy)) {
            return {
                handled: false,
                notModified: false,
                result,
            };
        }
        const response = (context.response || {});
        if (response.headersSent) {
            return {
                handled: false,
                notModified: false,
                result,
            };
        }
        const cacheControl = this.buildCacheControl(policy);
        if (cacheControl) {
            const currentValue = response.getHeader?.("Cache-Control");
            const mergedValue = mergeCacheControlValues(currentValue === undefined ? undefined : String(currentValue), cacheControl);
            this.setHeader(response, "Cache-Control", mergedValue);
        }
        const vary = normalizeList(policy.vary);
        if (vary.length > 0) {
            this.setVaryHeader(response, vary);
        }
        if (policy.noStore || policy.noCache) {
            this.setHeader(response, "Pragma", "no-cache");
        }
        const expires = this.resolveExpires(policy, result, context);
        if (expires) {
            this.setHeader(response, "Expires", expires.toUTCString());
        }
        else if (policy.noStore || policy.noCache) {
            this.setHeader(response, "Expires", "0");
        }
        const lastModifiedDate = this.resolveDateValue(policy.lastModified, result, context);
        const lastModified = lastModifiedDate?.toUTCString();
        if (lastModified) {
            this.setHeader(response, "Last-Modified", lastModified);
        }
        const etag = this.resolveEtag(policy.etag, result, context);
        if (etag) {
            this.setHeader(response, "ETag", etag);
        }
        if (this.isNotModified(context, etag, lastModifiedDate)) {
            this.setNotModified(response);
            return {
                handled: true,
                notModified: true,
                result: undefined,
                etag,
                lastModified,
            };
        }
        return {
            handled: false,
            notModified: false,
            result,
            etag,
            lastModified,
        };
    }
    shouldApplyPolicy(context, result, policy) {
        if (policy.viewsOnly && !isViewResult(result)) {
            return false;
        }
        if (typeof policy.when === "function" && !policy.when(result, context)) {
            return false;
        }
        const statusCode = resolveStatusCode(context, result);
        if (typeof statusCode === "number" && (statusCode < 200 || statusCode >= 400)) {
            return false;
        }
        return true;
    }
    resolveExpires(policy, result, context) {
        const expiresAt = this.resolveDateValue(policy.expiresAt, result, context);
        if (expiresAt) {
            return expiresAt;
        }
        const expiresInMs = policy.expiresIn !== undefined
            ? (0, configuration_1.parseCacheDuration)(policy.expiresIn)
            : policy.maxAge !== undefined
                ? (0, configuration_1.parseCacheDuration)(policy.maxAge)
                : undefined;
        if (expiresInMs === undefined) {
            return undefined;
        }
        return new Date(Date.now() + expiresInMs);
    }
    resolveDateValue(value, result, context) {
        const resolvedValue = typeof value === "function" ? value(result, context) : value;
        if (resolvedValue === undefined || resolvedValue === null) {
            return undefined;
        }
        if (resolvedValue instanceof Date) {
            return Number.isFinite(resolvedValue.getTime()) ? resolvedValue : undefined;
        }
        if (typeof resolvedValue === "number") {
            const date = new Date(resolvedValue);
            return Number.isFinite(date.getTime()) ? date : undefined;
        }
        const date = new Date(String(resolvedValue));
        return Number.isFinite(date.getTime()) ? date : undefined;
    }
    resolveEtag(value, result, context) {
        if (!value) {
            return undefined;
        }
        const options = value === true ? {} : value;
        const payload = typeof options.value === "function"
            ? options.value(result, context)
            : options.value !== undefined
                ? options.value
                : defaultEtagPayload(result);
        const hash = (0, crypto_1.createHash)("sha1")
            .update(JSON.stringify(sortValue(payload)))
            .digest("hex");
        return `${options.weak !== false ? "W/" : ""}"${hash}"`;
    }
    isNotModified(context, etag, lastModified) {
        if (context.method !== "GET") {
            return false;
        }
        const ifNoneMatch = getHeader(context.request, "if-none-match");
        if (etag && ifNoneMatch) {
            const candidates = ifNoneMatch.split(",").map((entry) => entry.trim()).filter(Boolean);
            if (candidates.includes("*") ||
                candidates.some((candidate) => stripWeakPrefix(candidate) === stripWeakPrefix(etag))) {
                return true;
            }
        }
        const ifModifiedSince = getHeader(context.request, "if-modified-since");
        if (lastModified && ifModifiedSince) {
            const since = new Date(ifModifiedSince);
            if (Number.isFinite(since.getTime())) {
                return Math.floor(lastModified.getTime() / 1000) <= Math.floor(since.getTime() / 1000);
            }
        }
        return false;
    }
    setHeader(response, name, value) {
        if (typeof response.setHeader === "function") {
            response.setHeader(name, value);
            return;
        }
        if (typeof response.header === "function") {
            response.header(name, value);
        }
    }
    setVaryHeader(response, values) {
        const currentValue = response.getHeader?.("Vary");
        const existingValues = Array.isArray(currentValue)
            ? normalizeList(currentValue)
            : currentValue !== undefined
                ? normalizeList(String(currentValue))
                : [];
        const normalizedValues = Array.from(new Set([...existingValues, ...values]));
        this.setHeader(response, "Vary", normalizedValues.join(", "));
    }
    setNotModified(response) {
        if (typeof response.status === "function") {
            response.status(304);
        }
        else if (typeof response.code === "function") {
            response.code(304);
        }
        else {
            response.statusCode = 304;
        }
        response.end?.();
    }
    toCacheSeconds(value) {
        const durationMs = (0, configuration_1.parseCacheDuration)(value);
        if (durationMs === undefined) {
            return undefined;
        }
        return Math.max(0, Math.floor(durationMs / 1000));
    }
    normalizePolicy(policy = {}) {
        return (0, http_cache_policy_1.inspectHttpCachePolicy)(policy);
    }
    inspectValidators(policy = {}) {
        const etag = policy.etag;
        const etagOptions = etag && etag !== true ? etag : undefined;
        return {
            etag: {
                enabled: Boolean(etag),
                weak: etag ? etagOptions?.weak !== false : undefined,
                customValue: Boolean(etagOptions?.value),
            },
            lastModified: {
                enabled: policy.lastModified !== undefined,
                dynamic: typeof policy.lastModified === "function",
            },
            expires: {
                enabled: policy.expiresAt !== undefined ||
                    policy.expiresIn !== undefined ||
                    policy.maxAge !== undefined,
                mode: policy.expiresAt !== undefined
                    ? "at"
                    : policy.expiresIn !== undefined
                        ? "in"
                        : policy.maxAge !== undefined
                            ? "max-age"
                            : undefined,
            },
        };
    }
    describeRoute(route, policy = {}) {
        return {
            ...route,
            cacheControl: this.buildCacheControl(policy),
            policy: this.normalizePolicy(policy),
            validators: this.inspectValidators(policy),
        };
    }
}
exports.HttpCacheService = HttpCacheService;
const httpCacheService = new HttpCacheService();
const getBaseHttpCacheService = () => {
    return httpCacheService;
};
exports.getBaseHttpCacheService = getBaseHttpCacheService;
const getHttpCacheService = () => {
    const container = (0, core_1.getCurrentContainer)();
    if (container && typeof container.getByName === "function") {
        try {
            return container.getByName((0, tokens_1.getCacheHttpServiceToken)());
        }
        catch {
            return httpCacheService;
        }
    }
    return httpCacheService;
};
exports.getHttpCacheService = getHttpCacheService;
