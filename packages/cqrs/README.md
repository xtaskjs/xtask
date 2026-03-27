# @xtaskjs/cqrs

CQRS integration package for xtaskjs.

This package is part of the xtaskjs project, hosted at [xtaskjs.io](https://xtaskjs.io).

## Installation
```bash
npm install @xtaskjs/cqrs @xtaskjs/typeorm reflect-metadata typeorm
```

## What It Provides
- Command, query, and event buses registered in the xtaskjs container.
- Decorators for command handlers, query handlers, event handlers, process managers, and projection rebuilders.
- Read/write datasource aliases backed by `@xtaskjs/typeorm`.
- Injection decorators for read and write repositories without hard-coding datasource names.
- Automatic in-memory command idempotency helpers with an overridable store.
- Lifecycle integration so CQRS bindings are initialized on startup and reset on shutdown.

## Configure Read And Write Databases
```typescript
import { Cqrs } from "@xtaskjs/cqrs";
import { TypeOrmDataSource } from "@xtaskjs/typeorm";

@TypeOrmDataSource({
  name: "write-db",
  type: "sqlite",
  database: "./write.sqlite",
  entities: [UserEntity],
  synchronize: true,
})
class WriteDatabase {}

@TypeOrmDataSource({
  name: "read-db",
  type: "sqlite",
  database: "./read.sqlite",
  entities: [UserProjection],
  synchronize: true,
})
class ReadDatabase {}

@Cqrs({
  writeDataSourceName: "write-db",
  readDataSourceName: "read-db",
})
class CqrsConfiguration {}
```

## Register Handlers
```typescript
import { Service } from "@xtaskjs/core";
import {
  CommandHandler,
  IdempotentCommand,
  EventHandler,
  ICommandHandler,
  IEventHandler,
  InjectEventBus,
  InjectReadRepository,
  InjectWriteRepository,
  QueryHandler,
  IQueryHandler,
} from "@xtaskjs/cqrs";
import { Repository } from "typeorm";

class CreateUserCommand {
  constructor(public readonly name: string) {}
}

class GetUsersQuery {}

class UserCreatedEvent {
  constructor(public readonly id: number, public readonly name: string) {}
}

@Service()
@IdempotentCommand<CreateUserCommand>({ key: (command) => command.name.toLowerCase() })
@CommandHandler(CreateUserCommand)
class CreateUserHandler implements ICommandHandler<CreateUserCommand, number> {
  constructor(
    @InjectWriteRepository(UserEntity)
    private readonly writeRepository: Repository<UserEntity>,
    @InjectEventBus()
    private readonly eventBus: EventBus
  ) {}

  async execute(command: CreateUserCommand): Promise<number> {
    const user = await this.writeRepository.save(this.writeRepository.create({ name: command.name }));
    await this.eventBus.publish(new UserCreatedEvent(user.id, user.name));
    return user.id;
  }
}

## Process Managers And Projection Rebuilders
Process managers react to events with access to the buses, and projection rebuilders let you reconstruct read models from write-side state.

```typescript
import {
  IProcessManager,
  IProjectionRebuilder,
  ProcessManager,
  ProjectionRebuilder,
} from "@xtaskjs/cqrs";

@Service()
@ProcessManager(UserCreatedEvent)
class WelcomeProcessManager implements IProcessManager<UserCreatedEvent> {
  async handle(event: UserCreatedEvent, context: ProcessManagerContext) {
    await context.commandBus.execute(new SendWelcomeEmailCommand(event.id));
  }
}

@Service()
@ProjectionRebuilder("users")
class UserProjectionRebuilder implements IProjectionRebuilder {
  constructor(
    @InjectWriteRepository(UserEntity)
    private readonly writeRepository: Repository<UserEntity>,
    @InjectReadRepository(UserProjection)
    private readonly readRepository: Repository<UserProjection>
  ) {}

  async rebuild() {
    const users = await this.writeRepository.find();
    await this.readRepository.clear();
    await this.readRepository.save(users.map((user) => ({ ...user })));
  }
}
```

@Service()
@QueryHandler(GetUsersQuery)
class GetUsersHandler implements IQueryHandler<GetUsersQuery, string[]> {
  constructor(
    @InjectReadRepository(UserProjection)
    private readonly readRepository: Repository<UserProjection>
  ) {}

  async execute(): Promise<string[]> {
    const users = await this.readRepository.find();
    return users.map((user) => user.name);
  }
}

@Service()
@EventHandler(UserCreatedEvent)
class UserProjectionHandler implements IEventHandler<UserCreatedEvent> {
  constructor(
    @InjectReadRepository(UserProjection)
    private readonly readRepository: Repository<UserProjection>
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    await this.readRepository.save(this.readRepository.create({ id: event.id, name: event.name }));
  }
}
```

## Resources
- Website: [xtaskjs.io](https://xtaskjs.io)
- Package: [npmjs.com/package/@xtaskjs/cqrs](https://www.npmjs.com/package/@xtaskjs/cqrs)
- Source: [github.com/xtaskjs/xtask](https://github.com/xtaskjs/xtask)