import { EventSourceReference } from "./types";

const EVENT_SOURCE_LIFECYCLE_TOKEN = "xtask:event-source:lifecycle";
const EVENT_STORE_TOKEN = "xtask:event-source:store";
const EVENT_SOURCE_BUS_TOKEN = "xtask:event-source:bus";
const EVENT_PUBLISHER_TOKEN = "xtask:event-source:publisher";
const EVENT_SOURCE_REPOSITORY_TOKEN_PREFIX = "xtask:event-source:repository";

const resolveReferenceName = (reference: EventSourceReference | string): string => {
  if (typeof reference === "string") {
    const normalized = reference.trim();
    if (!normalized) {
      throw new Error("Event-source reference name requires a non-empty string");
    }
    return normalized;
  }

  if (typeof reference?.name === "string" && reference.name.trim().length > 0) {
    return reference.name.trim();
  }

  throw new Error("Event-source reference requires a named class or non-empty string");
};

export const getEventSourceLifecycleToken = (): string => EVENT_SOURCE_LIFECYCLE_TOKEN;
export const getEventStoreToken = (): string => EVENT_STORE_TOKEN;
export const getEventSourceBusToken = (): string => EVENT_SOURCE_BUS_TOKEN;
export const getEventPublisherToken = (): string => EVENT_PUBLISHER_TOKEN;

export const getEventSourceRepositoryToken = (
  aggregate: EventSourceReference
): string => `${EVENT_SOURCE_REPOSITORY_TOKEN_PREFIX}:${resolveReferenceName(aggregate)}`;