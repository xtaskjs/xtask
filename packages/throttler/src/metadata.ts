import "reflect-metadata";
import { ThrottleMetadata } from "./types";

export const THROTTLE_CLASS_METADATA_KEY = Symbol("xtaskjs:throttler:class");
export const THROTTLE_METHOD_MAP_KEY = Symbol("xtaskjs:throttler:methods");

export const setThrottleMetadata = (
  target: any,
  propertyKey: PropertyKey | undefined,
  metadata: ThrottleMetadata
): void => {
  if (propertyKey === undefined) {
    // Class-level: target is the constructor
    Reflect.defineMetadata(THROTTLE_CLASS_METADATA_KEY, metadata, target);
    return;
  }

  // Method-level: target is the prototype
  const constructor = typeof target === "function" ? target : target.constructor;
  const methodMap: Map<PropertyKey, ThrottleMetadata> =
    Reflect.getMetadata(THROTTLE_METHOD_MAP_KEY, constructor) || new Map();
  methodMap.set(propertyKey, metadata);
  Reflect.defineMetadata(THROTTLE_METHOD_MAP_KEY, methodMap, constructor);
};

export const getThrottleMetadata = (
  target: any,
  propertyKey?: PropertyKey
): ThrottleMetadata | undefined => {
  if (propertyKey === undefined) {
    return Reflect.getMetadata(THROTTLE_CLASS_METADATA_KEY, target);
  }

  const methodMap: Map<PropertyKey, ThrottleMetadata> | undefined = Reflect.getMetadata(
    THROTTLE_METHOD_MAP_KEY,
    target
  );

  return methodMap?.get(propertyKey);
};
