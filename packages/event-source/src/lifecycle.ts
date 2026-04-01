import { ApplicationLifeCycle, Container } from "@xtaskjs/core";
import { EventSourceBus } from "./bus";
import {
  getEventSourceConfiguration,
  resetEventSourceConfiguration,
} from "./configuration";
import {
  getEventSourcedAggregateMetadata,
  getEventSourceSubscriberMetadata,
  listEventSourcedAggregates,
  resolveEventSourceName,
} from "./metadata";
import { EventSourceRepository } from "./repository";
import {
  getEventPublisherToken,
  getEventSourceBusToken,
  getEventSourceLifecycleToken,
  getEventSourceRepositoryToken,
  getEventStoreToken,
} from "./tokens";
import {
  AppendEventsRequest,
  EventEnvelope,
  EventPublisherFactory,
  EventSourceReference,
  EventStoreFactory,
  EventStoreRuntimeContext,
  IEventPublisher,
  IEventSourceSubscriber,
  IEventStore,
  PendingEvent,
} from "./types";
import { EventSourcedAggregateRoot } from "./aggregate";

const createEventId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const resolveFactoryValue = async <T extends object>(
  value: T | ((context: EventStoreRuntimeContext) => T | Promise<T>),
  context: EventStoreRuntimeContext,
  methodName: string
): Promise<T> => {
  if (typeof (value as any)?.[methodName] === "function") {
    return value as T;
  }

  return await (value as any)(context);
};

export class InMemoryEventStore implements IEventStore {
  private readonly streams = new Map<string, EventEnvelope<any>[]>();

  async append<T = any>(request: AppendEventsRequest<T>): Promise<EventEnvelope<T>[]> {
    const streamKey = `${request.stream}:${request.streamId}`;
    const currentEvents = this.streams.get(streamKey) || [];
    const currentVersion = currentEvents[currentEvents.length - 1]?.version || 0;
    const expectedVersion = request.expectedVersion ?? currentVersion;

    if (currentVersion !== expectedVersion) {
      throw new Error(
        `Event stream concurrency conflict for '${request.aggregateName}:${request.streamId}'. Expected version ${expectedVersion} but found ${currentVersion}`
      );
    }

    const persistedEvents = request.events.map((event, index) => this.toEnvelope(event, request, streamKey, currentVersion + index + 1));
    this.streams.set(streamKey, [...currentEvents, ...persistedEvents]);
    return persistedEvents;
  }

  async load<T = any>(stream: string, streamId: string): Promise<EventEnvelope<T>[]> {
    const streamKey = `${stream}:${streamId}`;
    return (this.streams.get(streamKey) || []).map((event) => ({
      ...event,
      occurredAt: new Date(event.occurredAt),
      metadata: { ...event.metadata },
    }));
  }

  async clear(): Promise<void> {
    this.streams.clear();
  }

  async destroy(): Promise<void> {
    this.streams.clear();
  }

  private toEnvelope<T>(
    event: PendingEvent<T>,
    request: AppendEventsRequest<T>,
    streamKey: string,
    version: number
  ): EventEnvelope<T> {
    return {
      id: event.id || createEventId(),
      stream: request.stream,
      streamId: request.streamId,
      streamKey,
      aggregateName: request.aggregateName,
      eventName: event.eventName || resolveEventSourceName((event.payload as any)?.constructor || request.aggregateName),
      version,
      occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),
      metadata: event.metadata ? { ...event.metadata } : {},
      payload: event.payload,
    };
  }
}

export class NoopEventPublisher implements IEventPublisher {
  async publish(): Promise<void> {
    return;
  }
}

export class EventSourceLifecycleManager {
  private readonly repositories = new Map<string, EventSourceRepository<any>>();
  private readonly subscribers = new Map<string, IEventSourceSubscriber<any>[]>();
  private readonly bus = new EventSourceBus((events) => this.publish(events));
  private container?: Container;
  private lifecycle?: ApplicationLifeCycle;
  private initialized = false;
  private stoppingRegistered = false;
  private publisher: IEventPublisher = new NoopEventPublisher();
  private store: IEventStore = new InMemoryEventStore();

  async initialize(container?: Container, lifecycle?: ApplicationLifeCycle): Promise<void> {
    await this.destroy();

    this.container = container;
    this.lifecycle = lifecycle;

    const context: EventStoreRuntimeContext = { container, lifecycle };
    const configuration = getEventSourceConfiguration();
    this.store = await resolveFactoryValue<IEventStore>(
      configuration.store as IEventStore | EventStoreFactory,
      context,
      "append"
    );
    this.publisher = await resolveFactoryValue<IEventPublisher>(
      configuration.publisher as IEventPublisher | EventPublisherFactory,
      context,
      "publish"
    );

    if (typeof this.store.initialize === "function") {
      await this.store.initialize(context);
    }

    if (typeof this.publisher.initialize === "function") {
      await this.publisher.initialize(context);
    }

    this.registerCoreContainerBindings(container);
    this.registerAggregateRepositories(container);
    this.registerSubscribers(container);

    this.initialized = true;

    if (!this.stoppingRegistered && lifecycle && typeof (lifecycle as any).on === "function") {
      lifecycle.on("stopping", async () => {
        await this.destroy();
      });
      this.stoppingRegistered = true;
    }
  }

  async destroy(): Promise<void> {
    this.repositories.clear();
    this.subscribers.clear();
    this.initialized = false;
    this.container = undefined;
    this.lifecycle = undefined;
    this.stoppingRegistered = false;

    if (typeof this.publisher.destroy === "function") {
      await this.publisher.destroy();
    }

    if (typeof this.store.destroy === "function") {
      await this.store.destroy();
    }

    this.publisher = new NoopEventPublisher();
    this.store = new InMemoryEventStore();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getContainer(): Container | undefined {
    return this.container;
  }

  getLifecycle(): ApplicationLifeCycle | undefined {
    return this.lifecycle;
  }

  getStore(): IEventStore {
    return this.store;
  }

  getPublisher(): IEventPublisher {
    return this.publisher;
  }

  getBus(): EventSourceBus {
    return this.bus;
  }

  getRepository<TAggregate extends EventSourcedAggregateRoot>(
    aggregate: EventSourceReference
  ): EventSourceRepository<TAggregate> {
    const token = getEventSourceRepositoryToken(aggregate);
    const repository = this.repositories.get(token);
    if (!repository) {
      throw new Error(
        `No event-source repository registered for aggregate '${resolveEventSourceName(aggregate)}'`
      );
    }
    return repository as EventSourceRepository<TAggregate>;
  }

  async publish(events: EventEnvelope<any>[]): Promise<void> {
    const context = {
      bus: this.bus,
      container: this.container,
      lifecycle: this,
      store: this.store,
    };

    for (const event of events) {
      const subscribers = this.subscribers.get(event.eventName) || [];
      for (const subscriber of subscribers) {
        await subscriber.handle(event.payload, event, context);
      }
    }

    if (getEventSourceConfiguration().autoPublish) {
      await this.publisher.publish(events);
    }
  }

  listRepositories(): string[] {
    return Array.from(this.repositories.keys()).sort();
  }

  private registerCoreContainerBindings(container?: Container): void {
    if (!container) {
      return;
    }

    const anyContainer = container as any;
    if (typeof anyContainer.registerNamedInstance !== "function") {
      return;
    }

    anyContainer.registerNamedInstance(getEventSourceLifecycleToken(), this);
    anyContainer.registerNamedInstance(getEventStoreToken(), this.store);
    anyContainer.registerNamedInstance(getEventSourceBusToken(), this.bus);
    anyContainer.registerNamedInstance(getEventPublisherToken(), this.publisher);
  }

  private registerAggregateRepositories(container?: Container): void {
    if (!container) {
      return;
    }

    const anyContainer = container as any;
    if (typeof anyContainer.registerNamedInstance !== "function") {
      return;
    }

    for (const aggregateType of listEventSourcedAggregates()) {
      const metadata = getEventSourcedAggregateMetadata(aggregateType);
      if (!metadata) {
        continue;
      }

      const token = getEventSourceRepositoryToken(aggregateType);
      const repository = new EventSourceRepository(aggregateType, this);
      this.repositories.set(token, repository);
      anyContainer.registerNamedInstance(token, repository);
    }
  }

  private registerSubscribers(container?: Container): void {
    if (!container) {
      return;
    }

    for (const type of container.getRegisteredTypes()) {
      const metadata = getEventSourceSubscriberMetadata(type);
      if (!metadata) {
        continue;
      }

      const subscriber = container.get(type) as IEventSourceSubscriber<any>;
      if (typeof subscriber.handle !== "function") {
        throw new Error(
          `Event-source subscriber '${type.name || "anonymous"}' must define handle()`
        );
      }

      for (const event of metadata.events) {
        const key = resolveEventSourceName(event);
        const existingSubscribers = this.subscribers.get(key) || [];
        existingSubscribers.push(subscriber);
        this.subscribers.set(key, existingSubscribers);
      }
    }
  }
}

const lifecycleManager = new EventSourceLifecycleManager();

export const initializeEventSourceIntegration = async (
  container?: Container,
  lifecycle?: ApplicationLifeCycle
): Promise<void> => {
  await lifecycleManager.initialize(container, lifecycle);
};

export const shutdownEventSourceIntegration = async (): Promise<void> => {
  await lifecycleManager.destroy();
};

export const resetEventSourceIntegration = async (): Promise<void> => {
  await shutdownEventSourceIntegration();
  resetEventSourceConfiguration();
};

export const getEventSourceLifecycleManager = (): EventSourceLifecycleManager => {
  return lifecycleManager;
};