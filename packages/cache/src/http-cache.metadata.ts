import "reflect-metadata";
import { mergeHttpCachePolicy } from "./http-cache.policy";
import { HttpCachePolicyOptions } from "./types";

const HTTP_CACHE_CLASS_POLICY_KEY = Symbol("xtask:cache:http:class-policy");
const HTTP_CACHE_METHOD_POLICY_KEY = Symbol("xtask:cache:http:method-policy");

type StoredMethodPolicy = {
  handler: PropertyKey;
  policy: HttpCachePolicyOptions;
};

export const registerHttpCacheClassPolicy = (
  target: any,
  policy: HttpCachePolicyOptions
): HttpCachePolicyOptions => {
  const existingPolicy = Reflect.getMetadata(HTTP_CACHE_CLASS_POLICY_KEY, target) as
    | HttpCachePolicyOptions
    | undefined;
  const mergedPolicy = mergeHttpCachePolicy(existingPolicy, policy);
  Reflect.defineMetadata(HTTP_CACHE_CLASS_POLICY_KEY, mergedPolicy, target);
  return mergedPolicy;
};

export const registerHttpCacheMethodPolicy = (
  target: any,
  handler: PropertyKey,
  policy: HttpCachePolicyOptions
): HttpCachePolicyOptions => {
  const entries =
    (Reflect.getMetadata(HTTP_CACHE_METHOD_POLICY_KEY, target.constructor) as StoredMethodPolicy[] | undefined) || [];
  const existingEntry = entries.find((entry) => entry.handler === handler);
  if (existingEntry) {
    existingEntry.policy = mergeHttpCachePolicy(existingEntry.policy, policy);
  } else {
    entries.push({
      handler,
      policy: mergeHttpCachePolicy({}, policy),
    });
  }

  Reflect.defineMetadata(HTTP_CACHE_METHOD_POLICY_KEY, entries, target.constructor);
  return (entries.find((entry) => entry.handler === handler) as StoredMethodPolicy).policy;
};

export const getHttpCacheClassPolicy = (target: any): HttpCachePolicyOptions | undefined => {
  const policy = Reflect.getMetadata(HTTP_CACHE_CLASS_POLICY_KEY, target) as HttpCachePolicyOptions | undefined;
  return policy ? mergeHttpCachePolicy({}, policy) : undefined;
};

export const getHttpCacheMethodPolicy = (
  target: any,
  handler: PropertyKey
): HttpCachePolicyOptions | undefined => {
  const entries =
    (Reflect.getMetadata(HTTP_CACHE_METHOD_POLICY_KEY, target) as StoredMethodPolicy[] | undefined) || [];
  const policy = entries.find((entry) => entry.handler === handler)?.policy;
  return policy ? mergeHttpCachePolicy({}, policy) : undefined;
};

export const getHttpCachePolicy = (
  target: any,
  handler?: PropertyKey
): HttpCachePolicyOptions | undefined => {
  const classPolicy = getHttpCacheClassPolicy(target);
  if (handler === undefined) {
    return classPolicy;
  }

  const methodPolicy = getHttpCacheMethodPolicy(target, handler);
  if (!classPolicy && !methodPolicy) {
    return undefined;
  }

  return mergeHttpCachePolicy(classPolicy, methodPolicy);
};