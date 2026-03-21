import "reflect-metadata";
import {
  QueueDelayInput,
  QueueHandlerMetadata,
  QueueHandlerOptions,
  QueueMatchPattern,
} from "./types";

export const QUEUE_HANDLERS_KEY = Symbol("xtaskjs:queues:handlers");

const durationUnits = new Map<string, number>([
  ["ms", 1],
  ["s", 1000],
  ["m", 60 * 1000],
  ["h", 60 * 60 * 1000],
  ["d", 24 * 60 * 60 * 1000],
]);

const clonePattern = (pattern?: QueueMatchPattern): QueueMatchPattern | undefined => {
  if (!pattern) {
    return undefined;
  }

  if (pattern instanceof RegExp) {
    return new RegExp(pattern.source, pattern.flags);
  }

  return pattern;
};

const cloneOptions = (options: QueueHandlerOptions): QueueHandlerOptions => {
  const group = Array.isArray(options.group) ? [...options.group] : options.group;
  return {
    ...options,
    group,
    pattern: clonePattern(options.pattern),
  };
};

export const parseQueueDuration = (value: QueueDelayInput): number => {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Queue duration must be a non-negative finite number. Received: ${value}`);
    }

    return Math.floor(value);
  }

  const normalizedValue = value.trim().toLowerCase();
  const match = normalizedValue.match(/^(\d+)\s*(ms|s|m|h|d)?$/i);
  if (!match) {
    throw new Error(`Unsupported queue duration '${value}'. Use numbers or values like 250ms, 15s, 10m, 1h.`);
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase() || "ms";
  const multiplier = durationUnits.get(unit);
  if (!multiplier) {
    throw new Error(`Unsupported queue duration unit '${unit}'`);
  }

  return amount * multiplier;
};

export const registerQueueHandlerMetadata = (
  target: any,
  metadata: QueueHandlerMetadata
): QueueHandlerMetadata[] => {
  const handlers: QueueHandlerMetadata[] = Reflect.getMetadata(QUEUE_HANDLERS_KEY, target) || [];
  handlers.push(metadata);
  Reflect.defineMetadata(QUEUE_HANDLERS_KEY, handlers, target);
  return handlers;
};

export const getQueueHandlerMetadata = (target: any): QueueHandlerMetadata[] => {
  return (Reflect.getMetadata(QUEUE_HANDLERS_KEY, target) || []).map(
    (metadata: QueueHandlerMetadata) => ({
      method: metadata.method,
      options: cloneOptions(metadata.options),
    })
  );
};