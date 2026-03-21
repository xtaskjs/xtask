import { AutoWired, Qualifier } from "@xtaskjs/core";
import { getQueueLifecycleManager } from "./lifecycle";
import { registerQueueHandlerMetadata } from "./metadata";
import {
  QueueHandlerMetadata,
  QueueHandlerOptions,
  QueueMatchPattern,
  QueuePublishOptions,
} from "./types";
import { getQueueLifecycleToken, getQueueServiceToken, getQueueTransportToken } from "./tokens";

const registerHandler = (
  target: any,
  propertyKey: string | symbol,
  options: QueueHandlerOptions
): void => {
  const metadata: QueueHandlerMetadata = {
    method: propertyKey,
    options,
  };

  registerQueueHandlerMetadata(target.constructor, metadata);
};

export const QueueHandler = (
  queue: string,
  options: Omit<QueueHandlerOptions, "queue" | "pattern"> = {}
): MethodDecorator => {
  if (!queue || !queue.trim()) {
    throw new Error("QueueHandler requires a non-empty queue name");
  }

  return (target, propertyKey) => {
    registerHandler(target, propertyKey, {
      ...options,
      queue: queue.trim(),
      pattern: undefined,
    });
  };
};

export const QueueSubscribe = QueueHandler;

export const QueuePattern = (
  pattern: QueueMatchPattern,
  options: Omit<QueueHandlerOptions, "queue" | "pattern"> = {}
): MethodDecorator => {
  if (!pattern) {
    throw new Error("QueuePattern requires a pattern value");
  }

  return (target, propertyKey) => {
    registerHandler(target, propertyKey, {
      ...options,
      queue: undefined,
      pattern,
    });
  };
};

export const PublishToQueue = (
  queue: string,
  options: QueuePublishOptions = {}
): MethodDecorator => {
  if (!queue || !queue.trim()) {
    throw new Error("PublishToQueue requires a non-empty queue name");
  }

  return (_target, _propertyKey, descriptor) => {
    const methodDescriptor = descriptor as PropertyDescriptor;
    const originalMethod = methodDescriptor?.value;
    if (typeof originalMethod !== "function") {
      throw new Error("PublishToQueue can only be used on methods");
    }

    methodDescriptor.value = async function (...args: any[]) {
      const result = await Promise.resolve(originalMethod.apply(this, args));
      if (result === undefined) {
        return result;
      }

      await getQueueLifecycleManager().publish(queue, result, options);
      return result;
    };

    return methodDescriptor;
  };
};

export const InjectQueueService = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getQueueServiceToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const InjectQueueTransport = (
  name = "default"
): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getQueueTransportToken(name);
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const InjectQueueLifecycleManager = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getQueueLifecycleToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};