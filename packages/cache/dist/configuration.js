"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetCacheConfiguration = exports.clearRegisteredCacheModels = exports.getRegisteredCacheModel = exports.getRegisteredCacheModels = exports.registerCacheModel = exports.clearCacheConfiguration = exports.resolveHttpCachePolicy = exports.getConfiguredHttpCacheDefaults = exports.getCacheConfiguration = exports.configureCache = exports.parseCacheDuration = void 0;
const http_cache_policy_1 = require("./http-cache.policy");
const model_reference_1 = require("./model-reference");
const CACHE_DURATION_UNITS = new Map([
    ["ms", 1],
    ["s", 1000],
    ["m", 60 * 1000],
    ["h", 60 * 60 * 1000],
    ["d", 24 * 60 * 60 * 1000],
    ["w", 7 * 24 * 60 * 60 * 1000],
]);
const defaultConfiguration = () => ({
    defaultDriver: "memory",
    namespace: "xtask:cache",
    connectOnStart: true,
    failOnDuplicateModels: true,
});
let configuration = defaultConfiguration();
const registeredModels = new Map();
const normalizeNamespace = (value) => {
    if (typeof value !== "string") {
        return undefined;
    }
    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : undefined;
};
const parseCacheDuration = (value) => {
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
        throw new Error(`Unsupported cache duration '${value}'. Use numbers or values like 500ms, 15s, 10m, 1h.`);
    }
    const amount = Number(match[1]);
    const unit = match[2]?.toLowerCase() || "ms";
    const multiplier = CACHE_DURATION_UNITS.get(unit);
    if (!multiplier) {
        throw new Error(`Unsupported cache duration unit '${unit}'`);
    }
    return amount * multiplier;
};
exports.parseCacheDuration = parseCacheDuration;
const configureCache = (value) => {
    configuration = {
        ...configuration,
        ...value,
        namespace: normalizeNamespace(value.namespace) || configuration.namespace,
        defaultDriver: value.defaultDriver || configuration.defaultDriver,
        defaultTtlMs: value.defaultTtl !== undefined ? (0, exports.parseCacheDuration)(value.defaultTtl) : configuration.defaultTtlMs,
        connectOnStart: value.connectOnStart ?? configuration.connectOnStart,
        failOnDuplicateModels: value.failOnDuplicateModels ?? configuration.failOnDuplicateModels,
        httpCacheDefaults: value.httpCacheDefaults
            ? (0, http_cache_policy_1.mergeHttpCachePolicy)(configuration.httpCacheDefaults, value.httpCacheDefaults)
            : configuration.httpCacheDefaults,
        redis: value.redis ? { ...(configuration.redis || {}), ...value.redis } : configuration.redis,
    };
    return (0, exports.getCacheConfiguration)();
};
exports.configureCache = configureCache;
const getCacheConfiguration = () => {
    return {
        ...configuration,
        httpCacheDefaults: configuration.httpCacheDefaults
            ? (0, http_cache_policy_1.mergeHttpCachePolicy)({}, configuration.httpCacheDefaults)
            : undefined,
        redis: configuration.redis ? { ...configuration.redis } : undefined,
    };
};
exports.getCacheConfiguration = getCacheConfiguration;
const getConfiguredHttpCacheDefaults = () => {
    const currentConfiguration = (0, exports.getCacheConfiguration)();
    return currentConfiguration.httpCacheDefaults
        ? (0, http_cache_policy_1.mergeHttpCachePolicy)({}, currentConfiguration.httpCacheDefaults)
        : undefined;
};
exports.getConfiguredHttpCacheDefaults = getConfiguredHttpCacheDefaults;
const resolveHttpCachePolicy = (policy = {}) => {
    return (0, http_cache_policy_1.mergeHttpCachePolicy)((0, exports.getConfiguredHttpCacheDefaults)(), policy);
};
exports.resolveHttpCachePolicy = resolveHttpCachePolicy;
const clearCacheConfiguration = () => {
    configuration = defaultConfiguration();
};
exports.clearCacheConfiguration = clearCacheConfiguration;
const registerCacheModel = (model, options = {}) => {
    const name = options.name?.trim() || (0, model_reference_1.resolveDeclaredCacheModelName)(model);
    if (!name) {
        throw new Error("Cache model requires a non-empty name");
    }
    const existingDefinition = registeredModels.get(name);
    if (existingDefinition && (0, exports.getCacheConfiguration)().failOnDuplicateModels) {
        throw new Error(`Cache model '${name}' is already registered`);
    }
    const normalizedNamespace = normalizeNamespace(options.namespace) || configuration.namespace;
    const definition = {
        name,
        driver: options.driver || configuration.defaultDriver,
        ttlMs: options.ttl !== undefined ? (0, exports.parseCacheDuration)(options.ttl) : configuration.defaultTtlMs,
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
exports.registerCacheModel = registerCacheModel;
const getRegisteredCacheModels = () => {
    return Array.from(registeredModels.values()).map((definition) => ({
        ...definition,
        redis: definition.redis ? { ...definition.redis } : undefined,
    }));
};
exports.getRegisteredCacheModels = getRegisteredCacheModels;
const getRegisteredCacheModel = (model) => {
    const definition = typeof model === "string"
        ? registeredModels.get((0, model_reference_1.resolveDeclaredCacheModelName)(model))
        : (0, exports.getRegisteredCacheModels)().find((candidate) => candidate.reference === model)
            || registeredModels.get((0, model_reference_1.resolveDeclaredCacheModelName)(model));
    if (!definition) {
        return undefined;
    }
    return {
        ...definition,
        redis: definition.redis ? { ...definition.redis } : undefined,
    };
};
exports.getRegisteredCacheModel = getRegisteredCacheModel;
const clearRegisteredCacheModels = () => {
    registeredModels.clear();
};
exports.clearRegisteredCacheModels = clearRegisteredCacheModels;
const resetCacheConfiguration = () => {
    (0, exports.clearCacheConfiguration)();
    (0, exports.clearRegisteredCacheModels)();
};
exports.resetCacheConfiguration = resetCacheConfiguration;
