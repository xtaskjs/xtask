import cron from "node-cron";
import { AutoWired, Qualifier } from "@xtaskjs/core";
import {
  ScheduledMethodMetadata,
  SchedulerCronOptions,
  SchedulerIntervalInput,
  SchedulerIntervalOptions,
  SchedulerTimeoutOptions,
} from "./types";
import { getSchedulerLifecycleToken, getSchedulerServiceToken } from "./tokens";
import { parseSchedulerDuration, registerScheduledMethod } from "./metadata";

const normalizeGroups = (value?: string | string[]): string[] => {
  if (!value) {
    return [];
  }

  const groups = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      groups
        .map((group) => group.trim())
        .filter((group) => group.length > 0)
    )
  );
};

const registerMethod = (
  target: any,
  propertyKey: string | symbol,
  metadata: Omit<ScheduledMethodMetadata, "method">
): void => {
  registerScheduledMethod(target.constructor, {
    ...metadata,
    method: propertyKey,
  });
};

export const Cron = (
  expression: string,
  options: SchedulerCronOptions = {}
): MethodDecorator => {
  if (!cron.validate(expression)) {
    throw new Error(`Invalid cron expression '${expression}'`);
  }

  return (target, propertyKey) => {
    registerMethod(target, propertyKey, {
      kind: "cron",
      expression,
      name: options.name,
      groups: normalizeGroups(options.group),
      retryDelayMs: options.retryDelay !== undefined ? parseSchedulerDuration(options.retryDelay) : 0,
      options: { ...options },
    });
  };
};

export const Every = (
  interval: SchedulerIntervalInput,
  options: SchedulerIntervalOptions = {}
): MethodDecorator => {
  const intervalMs = parseSchedulerDuration(interval);

  return (target, propertyKey) => {
    registerMethod(target, propertyKey, {
      kind: "interval",
      intervalMs,
      name: options.name,
      groups: normalizeGroups(options.group),
      retryDelayMs: options.retryDelay !== undefined ? parseSchedulerDuration(options.retryDelay) : 0,
      options: { ...options },
    });
  };
};

export const Interval = Every;

export const Timeout = (
  delay: SchedulerIntervalInput,
  options: SchedulerTimeoutOptions = {}
): MethodDecorator => {
  const delayMs = parseSchedulerDuration(delay);

  return (target, propertyKey) => {
    registerMethod(target, propertyKey, {
      kind: "timeout",
      delayMs,
      name: options.name,
      groups: normalizeGroups(options.group),
      retryDelayMs: options.retryDelay !== undefined ? parseSchedulerDuration(options.retryDelay) : 0,
      options: { ...options },
    });
  };
};

export const InjectSchedulerService = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getSchedulerServiceToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const InjectSchedulerLifecycleManager = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getSchedulerLifecycleToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};