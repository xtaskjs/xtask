import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { ApplicationLifeCycle, Container, Service } from "@xtaskjs/core";
import {
  clearRegisteredTypeOrmDataSources,
  initializeTypeOrmIntegration,
  registerTypeOrmDataSource,
  shutdownTypeOrmIntegration,
} from "@xtaskjs/typeorm";
import {
  initializeQueueIntegration,
  QueueHandler,
  QueueService,
  resetQueueIntegration,
} from "@xtaskjs/queues";
import {
  ApplyEvent,
  createQueueEventPublisher,
  createTypeOrmEventStore,
  EventEnvelope,
  EventSource,
  EventSourceRepository,
  EventSourceSubscriber,
  EventSourcedAggregate,
  EventSourcedAggregateRoot,
  getEventSourceBusToken,
  getEventSourceLifecycleManager,
  getEventStoreToken,
  initializeEventSourceIntegration,
  InjectEventSourceRepository,
  InjectEventStore,
  resetEventSourceIntegration,
  shutdownEventSourceIntegration,
} from "../src";

const flushQueue = async (cycles = 4): Promise<void> => {
  for (let index = 0; index < cycles; index += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
};

class UserRegisteredEvent {
  constructor(
    public readonly id: string,
    public readonly email: string
  ) {}
}

@EventSourcedAggregate({ stream: "users" })
class UserAggregate extends EventSourcedAggregateRoot {
  public email?: string;

  register(id: string, email: string): void {
    this.assignStreamId(id);
    this.raiseEvent(new UserRegisteredEvent(id, email));
  }

  @ApplyEvent(UserRegisteredEvent)
  onRegistered(event: UserRegisteredEvent): void {
    this.email = event.email;
  }
}

@Service()
class UserRegistrationService {
  constructor(
    @InjectEventSourceRepository(UserAggregate)
    public readonly users: EventSourceRepository<UserAggregate>
  ) {}

  async register(id: string, email: string): Promise<EventEnvelope<any>[]> {
    const user = this.users.create(id);
    user.register(id, email);
    return this.users.save(user);
  }
}

@Service()
@EventSourceSubscriber(UserRegisteredEvent)
class UserProjectionSubscriber {
  public emails: string[] = [];

  handle(event: UserRegisteredEvent): void {
    this.emails.push(event.email);
  }
}

@Service()
class EventSourceFacade {
  constructor(
    @InjectEventSourceRepository(UserAggregate)
    public readonly users: EventSourceRepository<UserAggregate>,
    @InjectEventStore()
    public readonly store: any
  ) {}
}

@Service()
class QueueEventCollector {
  public events: string[] = [];

  @QueueHandler("domain.UserRegisteredEvent", {
    name: "domain.user-registered.collector",
  })
  onEvent(payload: { eventName: string; payload: { email: string } }) {
    this.events.push(`${payload.eventName}:${payload.payload.email}`);
  }
}

@EventSource()
class DefaultEventSourceConfiguration {}

describe("@xtaskjs/event-source integration", () => {
  beforeEach(async () => {
    void DefaultEventSourceConfiguration;
    await resetEventSourceIntegration();
    await shutdownTypeOrmIntegration();
    await resetQueueIntegration();
    clearRegisteredTypeOrmDataSources();
  });

  afterEach(async () => {
    await resetEventSourceIntegration();
    await shutdownTypeOrmIntegration();
    await resetQueueIntegration();
    clearRegisteredTypeOrmDataSources();
  });

  test("registers aggregate repositories in the container and rehydrates aggregates from stored events", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();
    container.registerWithName(UserRegistrationService, { scope: "singleton" }, UserRegistrationService.name);
    container.registerWithName(UserProjectionSubscriber, { scope: "singleton" }, UserProjectionSubscriber.name);
    container.registerWithName(EventSourceFacade, { scope: "singleton" }, EventSourceFacade.name);

    await initializeEventSourceIntegration(container, lifecycle);

    const service = container.get(UserRegistrationService);
    const facade = container.get(EventSourceFacade);
    const subscriber = container.get(UserProjectionSubscriber);
    const bus = container.getByName(getEventSourceBusToken());
    const store = container.getByName(getEventStoreToken());

    expect(service.users).toBe(facade.users);
    expect(bus).toBeDefined();
    expect(store).toBeDefined();

    const savedEvents = await service.register("user-1", "ada@example.com");
    const reloaded = await facade.users.load("user-1");

    expect(savedEvents.map((event) => event.version)).toEqual([1]);
    expect(reloaded.email).toBe("ada@example.com");
    expect(subscriber.emails).toEqual(["ada@example.com"]);
    expect(getEventSourceLifecycleManager().listRepositories()).toEqual([
      "xtask:event-source:repository:UserAggregate",
    ]);
  });

  test("persists event streams in TypeORM-backed storage", async () => {
    @EventSource({
      store: createTypeOrmEventStore({
        dataSourceName: "events-db",
        tableName: "event_store_records",
      }),
    })
    class TypeOrmEventSourceConfiguration {}

    void TypeOrmEventSourceConfiguration;

    const container = new Container();
    container.registerWithName(UserRegistrationService, { scope: "singleton" }, UserRegistrationService.name);
    container.registerWithName(EventSourceFacade, { scope: "singleton" }, EventSourceFacade.name);

    registerTypeOrmDataSource({
      name: "events-db",
      type: "sqlite",
      database: ":memory:",
      entities: [],
      synchronize: true,
    });

    await initializeTypeOrmIntegration(container);
    await initializeEventSourceIntegration(container);

    const service = container.get(UserRegistrationService);
    await service.register("user-2", "grace@example.com");

    const reloaded = await container.get(EventSourceFacade).users.load("user-2");
    expect(reloaded.email).toBe("grace@example.com");
  });

  test("publishes stored events through the queues package for broker-backed delivery", async () => {
    @EventSource({
      publisher: createQueueEventPublisher({
        queue: (event) => `domain.${event.eventName}`,
      }),
    })
    class QueueBridgeEventSourceConfiguration {}

    void QueueBridgeEventSourceConfiguration;

    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();
    container.registerWithName(UserRegistrationService, { scope: "singleton" }, UserRegistrationService.name);
    container.registerWithName(QueueEventCollector, { scope: "singleton" }, QueueEventCollector.name);

    await initializeQueueIntegration(container, lifecycle);
    await initializeEventSourceIntegration(container, lifecycle);
    await lifecycle.emit("ready");

    const service = container.get(UserRegistrationService);
    const queues = new QueueService();
    const collector = container.get(QueueEventCollector);

    await service.register("user-3", "linus@example.com");
    await flushQueue(6);

    expect(collector.events).toEqual(["UserRegisteredEvent:linus@example.com"]);
    expect(queues.listTransportNames()).toEqual(["default"]);
  });

  test("clears runtime state when lifecycle stops", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();
    container.registerWithName(UserRegistrationService, { scope: "singleton" }, UserRegistrationService.name);

    await initializeEventSourceIntegration(container, lifecycle);
    expect(getEventSourceLifecycleManager().isInitialized()).toBe(true);

    await lifecycle.emit("stopping");

    expect(getEventSourceLifecycleManager().isInitialized()).toBe(false);
    await expect(container.get(UserRegistrationService).users.load("missing-user")).rejects.toThrow(
      "No event stream found for aggregate 'UserAggregate' and id 'missing-user'"
    );
  });
});