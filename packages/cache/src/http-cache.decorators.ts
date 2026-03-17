import { UseMiddlewares } from "@xtaskjs/common";
import { getHttpCacheService } from "./http-cache.service";
import {
  getHttpCachePolicy,
  registerHttpCacheClassPolicy,
  registerHttpCacheMethodPolicy,
} from "./http-cache.metadata";
import { resolveHttpCachePolicy } from "./configuration";
import { HttpCachePolicyOptions } from "./types";

const createHttpCacheMiddleware = <T = any>(resolvePolicy: () => HttpCachePolicyOptions<T>) => {
  return async (context: any, next: () => Promise<any>) => {
    const result = await next();
    const handled = await getHttpCacheService().handleResponse(
      context,
      result,
      resolveHttpCachePolicy(resolvePolicy())
    );
    return handled.result;
  };
};

export const CacheResponse = <T = any>(
  policy: HttpCachePolicyOptions<T> = {}
): MethodDecorator & ClassDecorator => {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (propertyKey === undefined) {
      registerHttpCacheClassPolicy(target, policy);
      const middlewareDecorator = UseMiddlewares(
        createHttpCacheMiddleware(() => getHttpCachePolicy(target) || policy)
      );
      middlewareDecorator(target);
      return;
    }

    registerHttpCacheMethodPolicy(target, propertyKey, policy);
    const middlewareDecorator = UseMiddlewares(
      createHttpCacheMiddleware(() => getHttpCachePolicy(target.constructor, propertyKey) || policy)
    );
    middlewareDecorator(target, propertyKey, descriptor!);
  };
};

export const BrowserCache = CacheResponse;

export const CacheHeaders = CacheResponse;

export const CacheView = <T = any>(
  policy: HttpCachePolicyOptions<T> = {}
): MethodDecorator & ClassDecorator => {
  return CacheResponse({
    ...policy,
    viewsOnly: true,
  });
};

export const NoStore = (): MethodDecorator & ClassDecorator => {
  return CacheResponse({
    noStore: true,
    noCache: true,
    mustRevalidate: true,
    etag: false,
    expiresAt: new Date(0),
  });
};

export const NoCache = (): MethodDecorator & ClassDecorator => {
  return CacheResponse({
    noCache: true,
    mustRevalidate: true,
    maxAge: 0,
    etag: false,
    expiresAt: new Date(0),
  });
};

export const VaryBy = (...headers: string[]): MethodDecorator & ClassDecorator => {
  return CacheResponse({
    vary: headers,
  });
};