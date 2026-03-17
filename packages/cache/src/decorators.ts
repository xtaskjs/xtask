import { AutoWired, Qualifier } from "@xtaskjs/core";
import { registerCacheModel, configureCache, parseCacheDuration } from "./configuration";
import {
  CacheConfiguration as CacheConfigurationOptions,
  CacheEvictOptions,
  CacheModelOptions,
  CacheModelReference,
  CachePutOptions,
  CacheableOptions,
} from "./types";
import {
  getCacheLifecycleToken,
  getCacheAdminServiceToken,
  getCacheHttpServiceToken,
  getCacheRepositoryToken,
  getCacheServiceToken,
} from "./tokens";
import { getCacheLifecycleManager } from "./lifecycle";

const resolveInvocationKey = (
  propertyKey: string | symbol,
  args: any[],
  key?: string | number | ((...args: any[]) => string | number)
): string | number => {
  if (typeof key === "function") {
    return key(...args);
  }

  if (key !== undefined) {
    return key;
  }

  return `${String(propertyKey)}:${JSON.stringify(args)}`;
};

const ensureMethodDescriptor = (descriptor?: PropertyDescriptor): PropertyDescriptor => {
  if (!descriptor || typeof descriptor.value !== "function") {
    throw new Error("Cache method decorators can only be used on methods");
  }
  return descriptor;
};

const shouldRunCondition = (condition: ((result: any, ...args: any[]) => boolean) | undefined, result: any, args: any[]): boolean => {
  if (!condition) {
    return true;
  }

  return condition(result, ...args);
};

export const CacheSettings = (options: CacheConfigurationOptions): ClassDecorator => {
  return () => {
    configureCache(options);
  };
};

export const CacheModel = <T = any>(options: CacheModelOptions<T> = {}): ClassDecorator => {
  return (target) => {
    registerCacheModel(target as unknown as CacheModelReference<T>, options);
  };
};

export const InjectCacheService = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getCacheServiceToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const InjectCacheLifecycleManager = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getCacheLifecycleToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const InjectCacheAdminService = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getCacheAdminServiceToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const InjectHttpCacheService = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getCacheHttpServiceToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const InjectCacheRepository = (
  model: CacheModelReference
): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getCacheRepositoryToken(model);
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const Cacheable = <T = any>(options: CacheableOptions<T>): MethodDecorator => {
  return (_target, propertyKey, descriptor) => {
    const methodDescriptor = ensureMethodDescriptor(descriptor);
    const originalMethod = methodDescriptor.value;

    methodDescriptor.value = async function (...args: any[]) {
      const repository = getCacheLifecycleManager().getRepository(options.model);
      const key = resolveInvocationKey(propertyKey, args, options.key);
      const cached = await repository.getEntry(key);
      if (cached.hit) {
        return cached.value;
      }

      const result = await Promise.resolve(originalMethod.apply(this, args));
      if (!shouldRunCondition(options.unless ? (value, ...rest) => !options.unless!(value, ...rest) : undefined, result, args)) {
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

export const CachePut = <T = any>(options: CachePutOptions<T>): MethodDecorator => {
  return (_target, propertyKey, descriptor) => {
    const methodDescriptor = ensureMethodDescriptor(descriptor);
    const originalMethod = methodDescriptor.value;

    methodDescriptor.value = async function (...args: any[]) {
      const result = await Promise.resolve(originalMethod.apply(this, args));
      if (!shouldRunCondition(options.when, result, args)) {
        return result;
      }

      const repository = getCacheLifecycleManager().getRepository(options.model);
      const key = resolveInvocationKey(propertyKey, args, options.key);
      const ttl = options.ttl !== undefined ? parseCacheDuration(options.ttl) : undefined;

      await repository.set(key, result, {
        ttl,
      });
      return result;
    };

    return methodDescriptor;
  };
};

export const CacheEvict = <T = any>(options: CacheEvictOptions<T>): MethodDecorator => {
  return (_target, propertyKey, descriptor) => {
    const methodDescriptor = ensureMethodDescriptor(descriptor);
    const originalMethod = methodDescriptor.value;

    methodDescriptor.value = async function (...args: any[]) {
      const repository = getCacheLifecycleManager().getRepository(options.model);
      const evict = async (result?: any) => {
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