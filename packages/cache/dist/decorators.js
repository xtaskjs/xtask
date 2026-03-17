"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheEvict = exports.CachePut = exports.Cacheable = exports.InjectCacheRepository = exports.InjectHttpCacheService = exports.InjectCacheAdminService = exports.InjectCacheLifecycleManager = exports.InjectCacheService = exports.CacheModel = exports.CacheSettings = void 0;
const core_1 = require("@xtaskjs/core");
const configuration_1 = require("./configuration");
const tokens_1 = require("./tokens");
const lifecycle_1 = require("./lifecycle");
const resolveInvocationKey = (propertyKey, args, key) => {
    if (typeof key === "function") {
        return key(...args);
    }
    if (key !== undefined) {
        return key;
    }
    return `${String(propertyKey)}:${JSON.stringify(args)}`;
};
const ensureMethodDescriptor = (descriptor) => {
    if (!descriptor || typeof descriptor.value !== "function") {
        throw new Error("Cache method decorators can only be used on methods");
    }
    return descriptor;
};
const shouldRunCondition = (condition, result, args) => {
    if (!condition) {
        return true;
    }
    return condition(result, ...args);
};
const CacheSettings = (options) => {
    return () => {
        (0, configuration_1.configureCache)(options);
    };
};
exports.CacheSettings = CacheSettings;
const CacheModel = (options = {}) => {
    return (target) => {
        (0, configuration_1.registerCacheModel)(target, options);
    };
};
exports.CacheModel = CacheModel;
const InjectCacheService = () => {
    return (target, propertyKey, parameterIndex) => {
        const token = (0, tokens_1.getCacheServiceToken)();
        if (typeof parameterIndex === "number") {
            (0, core_1.Qualifier)(token)(target, propertyKey, parameterIndex);
            return;
        }
        if (propertyKey !== undefined) {
            (0, core_1.AutoWired)({ qualifier: token })(target, propertyKey);
        }
    };
};
exports.InjectCacheService = InjectCacheService;
const InjectCacheLifecycleManager = () => {
    return (target, propertyKey, parameterIndex) => {
        const token = (0, tokens_1.getCacheLifecycleToken)();
        if (typeof parameterIndex === "number") {
            (0, core_1.Qualifier)(token)(target, propertyKey, parameterIndex);
            return;
        }
        if (propertyKey !== undefined) {
            (0, core_1.AutoWired)({ qualifier: token })(target, propertyKey);
        }
    };
};
exports.InjectCacheLifecycleManager = InjectCacheLifecycleManager;
const InjectCacheAdminService = () => {
    return (target, propertyKey, parameterIndex) => {
        const token = (0, tokens_1.getCacheAdminServiceToken)();
        if (typeof parameterIndex === "number") {
            (0, core_1.Qualifier)(token)(target, propertyKey, parameterIndex);
            return;
        }
        if (propertyKey !== undefined) {
            (0, core_1.AutoWired)({ qualifier: token })(target, propertyKey);
        }
    };
};
exports.InjectCacheAdminService = InjectCacheAdminService;
const InjectHttpCacheService = () => {
    return (target, propertyKey, parameterIndex) => {
        const token = (0, tokens_1.getCacheHttpServiceToken)();
        if (typeof parameterIndex === "number") {
            (0, core_1.Qualifier)(token)(target, propertyKey, parameterIndex);
            return;
        }
        if (propertyKey !== undefined) {
            (0, core_1.AutoWired)({ qualifier: token })(target, propertyKey);
        }
    };
};
exports.InjectHttpCacheService = InjectHttpCacheService;
const InjectCacheRepository = (model) => {
    return (target, propertyKey, parameterIndex) => {
        const token = (0, tokens_1.getCacheRepositoryToken)(model);
        if (typeof parameterIndex === "number") {
            (0, core_1.Qualifier)(token)(target, propertyKey, parameterIndex);
            return;
        }
        if (propertyKey !== undefined) {
            (0, core_1.AutoWired)({ qualifier: token })(target, propertyKey);
        }
    };
};
exports.InjectCacheRepository = InjectCacheRepository;
const Cacheable = (options) => {
    return (_target, propertyKey, descriptor) => {
        const methodDescriptor = ensureMethodDescriptor(descriptor);
        const originalMethod = methodDescriptor.value;
        methodDescriptor.value = async function (...args) {
            const repository = (0, lifecycle_1.getCacheLifecycleManager)().getRepository(options.model);
            const key = resolveInvocationKey(propertyKey, args, options.key);
            const cached = await repository.getEntry(key);
            if (cached.hit) {
                return cached.value;
            }
            const result = await Promise.resolve(originalMethod.apply(this, args));
            if (!shouldRunCondition(options.unless ? (value, ...rest) => !options.unless(value, ...rest) : undefined, result, args)) {
                return result;
            }
            await repository.set(key, result, {
                ttl: options.ttl,
            });
            return result;
        };
        return methodDescriptor;
    };
};
exports.Cacheable = Cacheable;
const CachePut = (options) => {
    return (_target, propertyKey, descriptor) => {
        const methodDescriptor = ensureMethodDescriptor(descriptor);
        const originalMethod = methodDescriptor.value;
        methodDescriptor.value = async function (...args) {
            const result = await Promise.resolve(originalMethod.apply(this, args));
            if (!shouldRunCondition(options.when, result, args)) {
                return result;
            }
            const repository = (0, lifecycle_1.getCacheLifecycleManager)().getRepository(options.model);
            const key = resolveInvocationKey(propertyKey, args, options.key);
            const ttl = options.ttl !== undefined ? (0, configuration_1.parseCacheDuration)(options.ttl) : undefined;
            await repository.set(key, result, {
                ttl,
            });
            return result;
        };
        return methodDescriptor;
    };
};
exports.CachePut = CachePut;
const CacheEvict = (options) => {
    return (_target, propertyKey, descriptor) => {
        const methodDescriptor = ensureMethodDescriptor(descriptor);
        const originalMethod = methodDescriptor.value;
        methodDescriptor.value = async function (...args) {
            const repository = (0, lifecycle_1.getCacheLifecycleManager)().getRepository(options.model);
            const evict = async (result) => {
                if (!shouldRunCondition(options.when, result, args)) {
                    return;
                }
                if (options.all) {
                    await repository.clear();
                    return;
                }
                const key = resolveInvocationKey(propertyKey, args, options.key);
                await repository.delete(key);
            };
            if (options.beforeInvocation) {
                await evict();
            }
            const result = await Promise.resolve(originalMethod.apply(this, args));
            if (!options.beforeInvocation) {
                await evict(result);
            }
            return result;
        };
        return methodDescriptor;
    };
};
exports.CacheEvict = CacheEvict;
