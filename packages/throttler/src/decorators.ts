import { UseGuards } from "@xtaskjs/common";
import { AutoWired, Qualifier } from "@xtaskjs/core";
import { parseTtl } from "./configuration";
import { throttlerGuard } from "./guards";
import { setThrottleMetadata } from "./metadata";
import { getThrottlerLifecycleToken, getThrottlerServiceToken } from "./tokens";
import { ThrottleOptions, ThrottleTtlInput } from "./types";

export const Throttle = (
  limit: number,
  ttl: ThrottleTtlInput,
  options: ThrottleOptions = {}
): MethodDecorator & ClassDecorator => {
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error(`@Throttle limit must be a positive finite number. Received: ${limit}`);
  }

  const ttlMs = parseTtl(ttl);
  const guardDecorator = UseGuards(throttlerGuard);

  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    setThrottleMetadata(target, propertyKey, { limit, ttlMs, options });

    if (propertyKey === undefined) {
      (guardDecorator as ClassDecorator)(target);
      return;
    }

    (guardDecorator as MethodDecorator)(target, propertyKey, descriptor!);
  };
};

export const InjectThrottlerService = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getThrottlerServiceToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }
    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const InjectThrottlerLifecycleManager = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getThrottlerLifecycleToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }
    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};
