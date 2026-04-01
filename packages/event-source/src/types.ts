import type { ApplicationLifeCycle, Container } from "@xtaskjs/core";
import type { EventSourcedAggregateRoot } from "./aggregate";
import type { EventSourceBus } from "./bus";
import type { EventSourceLifecycleManager } from "./lifecycle";

export type EventSourceReference<T = any> = string | (new (...args: any[]) => T);

export interface PendingEvent<T = any> {
  id?: string;
  eventName?: string;
  occurredAt?: Date;
  metadata?: Record<string, any>;
  payload: T;
}

export interface EventEnvelope<T = any> {
  id: string;
  stream: string;
  streamId: string;
  streamKey: string;
  aggregateName: string;
  eventName: string;
  version: number;
  occurredAt: Date;
  metadata: Record<string, any>;
  payload: T;
}

export interface AppendEventsRequest<T = any> {
  stream: string;
  streamId: string;
  aggregateName: string;
  expectedVersion?: number;
  events: PendingEvent<T>[];
}

export interface EventStoreRuntimeContext {
  container?: Container;
  lifecycle?: ApplicationLifeCycle;
}

export interface IEventStore {
  initialize?(context: EventStoreRuntimeContext): Promise<void> | void;
  append<T = any>(request: AppendEventsRequest<T>): Promise<EventEnvelope<T>[]>;
  load<T = any>(stream: string, streamId: string): Promise<EventEnvelope<T>[]>;
  destroy?(): Promise<void> | void;
  clear?(): Promise<void> | void;
}

export interface IEventPublisher {
  initialize?(context: EventStoreRuntimeContext): Promise<void> | void;
  publish(events: EventEnvelope<any>[]): Promise<void> | void;
  destroy?(): Promise<void> | void;
}

export type EventStoreFactory = (
  context: EventStoreRuntimeContext
) => IEventStore | Promise<IEventStore>;

export type EventPublisherFactory = (
  context: EventStoreRuntimeContext
) => IEventPublisher | Promise<IEventPublisher>;

export interface EventSourceOptions {
  store?: IEventStore | EventStoreFactory;
  publisher?: IEventPublisher | EventPublisherFactory;
  autoPublish?: boolean;
  failOnMissingApply?: boolean;
}

export interface EventSourcedAggregateOptions {
  stream?: string;
}

export interface EventSourceSubscriberContext {
  bus: EventSourceBus;
  container?: Container;
  lifecycle: EventSourceLifecycleManager;
  store: IEventStore;
}

export interface IEventSourceSubscriber<TEvent = any> {
  handle(
    event: TEvent,
    envelope: EventEnvelope<TEvent>,
    context: EventSourceSubscriberContext
  ): Promise<void> | void;
}

export interface EventSourceRepositorySaveOptions {
  expectedVersion?: number;
}

export interface EventSourceRepositoryLike<TAggregate extends EventSourcedAggregateRoot> {
  create(streamId: string): TAggregate;
  load(streamId: string): Promise<TAggregate>;
  loadOrCreate(streamId: string): Promise<TAggregate>;
  save(
    aggregate: TAggregate,
    options?: EventSourceRepositorySaveOptions
  ): Promise<EventEnvelope<any>[]>;
}