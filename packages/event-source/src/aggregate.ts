import { getEventSourceConfiguration } from "./configuration";
import {
  getApplyEventMetadata,
  resolvePayloadEventSourceName,
} from "./metadata";
import { EventEnvelope, PendingEvent } from "./types";

interface AggregateRuntimeState {
  streamId?: string;
  uncommittedEvents: PendingEvent[];
  version: number;
}

const AGGREGATE_STATE = Symbol("xtask:event-source:aggregate-state");

const getState = (aggregate: any): AggregateRuntimeState => {
  if (!aggregate[AGGREGATE_STATE]) {
    aggregate[AGGREGATE_STATE] = {
      uncommittedEvents: [],
      version: 0,
    } satisfies AggregateRuntimeState;
  }

  return aggregate[AGGREGATE_STATE] as AggregateRuntimeState;
};

export abstract class EventSourcedAggregateRoot {
  assignStreamId(streamId: string): void {
    const normalized = streamId?.trim();
    if (!normalized) {
      throw new Error("Event-sourced aggregate requires a non-empty stream id");
    }

    getState(this).streamId = normalized;
  }

  getStreamId(): string | undefined {
    return getState(this).streamId;
  }

  getVersion(): number {
    return getState(this).version;
  }

  getUncommittedEvents(): PendingEvent[] {
    return getState(this).uncommittedEvents.map((event) => ({
      ...event,
      occurredAt: event.occurredAt ? new Date(event.occurredAt) : undefined,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    }));
  }

  loadFromHistory(events: EventEnvelope[]): void {
    const state = getState(this);

    for (const envelope of events) {
      this.applyEnvelope(envelope.payload, envelope);
      state.streamId = envelope.streamId;
      state.version = envelope.version;
    }

    state.uncommittedEvents = [];
  }

  markEventsCommitted(events: EventEnvelope[]): void {
    const state = getState(this);
    const lastEvent = events[events.length - 1];
    if (lastEvent) {
      state.streamId = lastEvent.streamId;
      state.version = lastEvent.version;
    }

    state.uncommittedEvents = [];
  }

  protected raiseEvent<T>(event: T, metadata?: Record<string, any>): T {
    const state = getState(this);
    const pendingEvent: PendingEvent<T> = {
      eventName: resolvePayloadEventSourceName(event),
      occurredAt: new Date(),
      metadata: metadata ? { ...metadata } : undefined,
      payload: event,
    };

    this.applyEnvelope(event, undefined);
    state.uncommittedEvents.push(pendingEvent);
    return event;
  }

  private applyEnvelope(event: any, envelope?: EventEnvelope): void {
    const eventName = envelope?.eventName || resolvePayloadEventSourceName(event);
    const handlers = getApplyEventMetadata(this.constructor).filter(
      (metadata) => metadata.eventName === eventName
    );

    if (handlers.length === 0) {
      if (getEventSourceConfiguration().failOnMissingApply) {
        throw new Error(
          `No event applier registered for '${eventName}' in aggregate '${this.constructor.name || "anonymous"}'`
        );
      }
      return;
    }

    for (const handler of handlers) {
      const method = (this as any)[handler.method];
      if (typeof method !== "function") {
        throw new Error(
          `Event applier '${String(handler.method)}' is not a function on aggregate '${this.constructor.name || "anonymous"}'`
        );
      }

      method.call(this, event, envelope);
    }
  }
}