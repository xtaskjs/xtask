import "reflect-metadata";
import { getComponentMetadata, Service } from "@xtaskjs/core";
import {
  EventSourceReference,
  EventSourcedAggregateOptions,
} from "./types";

const EVENT_SOURCE_AGGREGATE_KEY = Symbol("xtask:event-source:aggregate");
const APPLY_EVENT_KEY = Symbol("xtask:event-source:apply-event");
const EVENT_SOURCE_SUBSCRIBER_KEY = Symbol("xtask:event-source:subscriber");

const registeredAggregates = new Set<any>();

export interface EventSourcedAggregateMetadata {
  name: string;
  stream: string;
}

export interface ApplyEventMetadata {
  eventName: string;
  method: string | symbol;
}

export interface EventSourceSubscriberMetadata {
  events: EventSourceReference[];
}

const ensureServiceMetadata = (target: any): void => {
  if (!getComponentMetadata(target)) {
    Service()(target);
  }
};

export const resolveEventSourceName = (reference: EventSourceReference | string): string => {
  if (typeof reference === "string") {
    const normalized = reference.trim();
    if (!normalized) {
      throw new Error("Event-source name requires a non-empty string");
    }
    return normalized;
  }

  if (typeof reference?.name === "string" && reference.name.trim().length > 0) {
    return reference.name.trim();
  }

  throw new Error("Event-source reference requires a named class or non-empty string");
};

export const resolvePayloadEventSourceName = (value: any): string => {
  if (typeof value === "string") {
    return resolveEventSourceName(value);
  }

  if (typeof value?.type === "string" && value.type.trim().length > 0) {
    return value.type.trim();
  }

  if (typeof value?.constructor?.name === "string" && value.constructor.name !== "Object") {
    return value.constructor.name;
  }

  throw new Error(
    "Event-source payload must be a named class instance or expose a non-empty string 'type' property"
  );
};

export const defineEventSourcedAggregateMetadata = (
  target: any,
  options: EventSourcedAggregateOptions = {}
): void => {
  const name = resolveEventSourceName(target);
  const stream = options.stream?.trim() || name;
  registeredAggregates.add(target);
  Reflect.defineMetadata(EVENT_SOURCE_AGGREGATE_KEY, { name, stream }, target);
};

export const registerApplyEventMetadata = (
  target: any,
  metadata: ApplyEventMetadata
): void => {
  const existing: ApplyEventMetadata[] = Reflect.getMetadata(APPLY_EVENT_KEY, target) || [];
  Reflect.defineMetadata(APPLY_EVENT_KEY, [...existing, metadata], target);
};

export const defineEventSourceSubscriberMetadata = (
  target: any,
  events: EventSourceReference[]
): void => {
  ensureServiceMetadata(target);
  Reflect.defineMetadata(EVENT_SOURCE_SUBSCRIBER_KEY, { events }, target);
};

export const getEventSourcedAggregateMetadata = (
  target: any
): EventSourcedAggregateMetadata | undefined => {
  return Reflect.getMetadata(EVENT_SOURCE_AGGREGATE_KEY, target);
};

export const getApplyEventMetadata = (target: any): ApplyEventMetadata[] => {
  return Reflect.getMetadata(APPLY_EVENT_KEY, target) || [];
};

export const getEventSourceSubscriberMetadata = (
  target: any
): EventSourceSubscriberMetadata | undefined => {
  return Reflect.getMetadata(EVENT_SOURCE_SUBSCRIBER_KEY, target);
};

export const listEventSourcedAggregates = (): any[] => {
  return Array.from(registeredAggregates.values());
};