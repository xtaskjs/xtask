import "reflect-metadata";
import { ScheduledMethodMetadata, SchedulerIntervalInput } from "./types";

export const SCHEDULED_JOBS_KEY = Symbol("xtaskjs:scheduler:jobs");

const durationUnits = new Map<string, number>([
  ["ms", 1],
  ["s", 1000],
  ["m", 60 * 1000],
  ["h", 60 * 60 * 1000],
  ["d", 24 * 60 * 60 * 1000],
  ["w", 7 * 24 * 60 * 60 * 1000],
]);

export const parseSchedulerDuration = (value: SchedulerIntervalInput): number => {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Scheduler duration must be a non-negative finite number. Received: ${value}`);
    }
    return Math.floor(value);
  }

  const normalizedValue = value.trim().toLowerCase();
  const match = normalizedValue.match(/^(\d+)\s*(ms|s|m|h|d|w)?$/i);
  if (!match) {
    throw new Error(`Unsupported scheduler duration '${value}'. Use numbers or values like 500ms, 15s, 10m, 1h.`);
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase() || "ms";
  const multiplier = durationUnits.get(unit);
  if (!multiplier) {
    throw new Error(`Unsupported scheduler duration unit '${unit}'`);
  }

  return amount * multiplier;
};

export const registerScheduledMethod = (
  target: any,
  metadata: ScheduledMethodMetadata
): ScheduledMethodMetadata[] => {
  const methods: ScheduledMethodMetadata[] = Reflect.getMetadata(SCHEDULED_JOBS_KEY, target) || [];
  methods.push(metadata);
  Reflect.defineMetadata(SCHEDULED_JOBS_KEY, methods, target);
  return methods;
};

export const getScheduledMethodMetadata = (target: any): ScheduledMethodMetadata[] => {
  return (Reflect.getMetadata(SCHEDULED_JOBS_KEY, target) || []).map((metadata: ScheduledMethodMetadata) => ({
    ...metadata,
    options: { ...metadata.options },
  }));
};