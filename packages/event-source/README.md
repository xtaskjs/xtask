# @xtaskjs/event-source

Event sourcing integration package for xtaskjs.

This package is part of the xtaskjs project, hosted at [xtaskjs.io](https://xtaskjs.io).

## Installation
```bash
npm install @xtaskjs/event-source reflect-metadata
```

Optional adapters:

```bash
npm install @xtaskjs/typeorm typeorm
npm install @xtaskjs/queues amqplib
```

## What It Provides
- Event-sourced aggregate roots with decorator-based event appliers.
- Aggregate repositories registered in the xtaskjs container for constructor and property injection.
- A lifecycle-managed event store abstraction with an in-memory implementation by default.
- A TypeORM event-store adapter for durable stream persistence.
- An optional queue publisher bridge for pushing stored events to the xtaskjs queues package, including RabbitMQ transports.
- In-process event subscribers for projections, integrations, and side effects without taking over CQRS responsibilities.

## Package Boundary With CQRS
`@xtaskjs/event-source` is responsible for aggregate rehydration, optimistic stream appends, and stored-event publication.

`@xtaskjs/cqrs` remains responsible for command, query, and event handler orchestration. You can use both packages together: persist domain events with `@xtaskjs/event-source`, then project or route them with CQRS or queues.

## Configure Event Sourcing
```typescript
import {
  EventSource,
  createQueueEventPublisher,
  createTypeOrmEventStore,
} from "@xtaskjs/event-source";

@EventSource({
  store: createTypeOrmEventStore({
    dataSourceName: "write-db",
    tableName: "event_store",
  }),
  publisher: createQueueEventPublisher({
    queue: (event) => `domain.${event.eventName}`,
    transportName: "rabbitmq",
  }),
})
class EventSourceConfiguration {}
```

If you do not configure a store, xtaskjs uses an in-memory event store.

## Define An Aggregate
```typescript
import {
  ApplyEvent,
  EventSourcedAggregate,
  EventSourcedAggregateRoot,
  EventSourceRepository,
  InjectEventSourceRepository,
} from "@xtaskjs/event-source";
import { Service } from "@xtaskjs/core";

class UserRegisteredEvent {
  constructor(
    public readonly id: string,
    public readonly email: string
  ) {}
}

@EventSourcedAggregate({ stream: "users" })
class UserAggregate extends EventSourcedAggregateRoot {
  public email?: string;

  register(id: string, email: string) {
    this.assignStreamId(id);
    this.raiseEvent(new UserRegisteredEvent(id, email));
  }

  @ApplyEvent(UserRegisteredEvent)
  onRegistered(event: UserRegisteredEvent) {
    this.email = event.email;
  }
}

@Service()
class UserService {
  constructor(
    @InjectEventSourceRepository(UserAggregate)
    private readonly users: EventSourceRepository<UserAggregate>
  ) {}

  async register(id: string, email: string) {
    const user = this.users.create(id);
    user.register(id, email);
    await this.users.save(user);
  }
}
```

## Subscribe To Stored Events
```typescript
import { Service } from "@xtaskjs/core";
import { EventSourceSubscriber, IEventSourceSubscriber } from "@xtaskjs/event-source";

@Service()
@EventSourceSubscriber(UserRegisteredEvent)
class WelcomeProjection implements IEventSourceSubscriber<UserRegisteredEvent> {
  public emails: string[] = [];

  handle(event: UserRegisteredEvent) {
    this.emails.push(event.email);
  }
}
```

Subscribers receive the event payload, the stored event envelope, and a context with access to the lifecycle manager, store, and bus.

## Resources
- Website: [xtaskjs.io](https://xtaskjs.io)
- Package: [npmjs.com/package/@xtaskjs/event-source](https://www.npmjs.com/package/@xtaskjs/event-source)
- Source: [github.com/xtaskjs/xtask](https://github.com/xtaskjs/xtask)