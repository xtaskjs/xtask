import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, test } from "@jest/globals";
import { ApplicationLifeCycle, Container, Service } from "@xtaskjs/core";
import {
  clearRegisteredTypeOrmDataSources,
  initializeTypeOrmIntegration,
  registerTypeOrmDataSource,
  shutdownTypeOrmIntegration,
} from "@xtaskjs/typeorm";
import { Column, DataSource, Entity, PrimaryColumn, Repository } from "typeorm";
import {
  CommandBus,
  CommandHandler,
  configureCqrs,
  Cqrs,
  EventBus,
  EventHandler,
  IdempotentCommand,
  IProcessManager,
  IProjectionRebuilder,
  getCommandBusToken,
  getCqrsLifecycleManager,
  getReadDataSourceToken,
  getWriteDataSourceToken,
  InjectCommandBus,
  InjectEventBus,
  InjectQueryBus,
  InjectReadDataSource,
  InjectReadRepository,
  InjectWriteDataSource,
  InjectWriteRepository,
  initializeCqrsIntegration,
  ProcessManager,
  ProjectionRebuilder,
  QueryBus,
  QueryHandler,
  resetCqrsIntegration,
  shutdownCqrsIntegration,
} from "../src";

@Entity("users")
class UserEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;
}

class CreateUserCommand {
  constructor(
    public readonly id: string,
    public readonly name: string
  ) {}
}

class ListUsersQuery {}

class UserCreatedEvent {
  constructor(
    public readonly id: string,
    public readonly name: string
  ) {}
}

class MarkUserOnboardedCommand {
  constructor(public readonly id: string) {}
}

class IdempotentCreateUserCommand {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly idempotencyKey: string
  ) {}
}

@Service()
@CommandHandler(CreateUserCommand)
class CreateUserHandler {
  constructor(
    @InjectWriteRepository(UserEntity)
    private readonly writeRepository: Repository<UserEntity>,
    @InjectEventBus()
    private readonly eventBus: EventBus
  ) {}

  async execute(command: CreateUserCommand): Promise<string> {
    await this.writeRepository.save(this.writeRepository.create({ id: command.id, name: command.name }));
    await this.eventBus.publish(new UserCreatedEvent(command.id, command.name));
    return command.id;
  }
}

@Service()
@QueryHandler(ListUsersQuery)
class ListUsersHandler {
  constructor(
    @InjectReadRepository(UserEntity)
    private readonly readRepository: Repository<UserEntity>
  ) {}

  async execute(): Promise<string[]> {
    const users = await this.readRepository.find({ order: { id: "ASC" } });
    return users.map((user) => user.name);
  }
}

@Service()
@EventHandler(UserCreatedEvent)
class UserProjectionHandler {
  constructor(
    @InjectReadRepository(UserEntity)
    private readonly readRepository: Repository<UserEntity>
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    await this.readRepository.save(this.readRepository.create({ id: event.id, name: event.name }));
  }
}

@Service()
@CommandHandler(MarkUserOnboardedCommand)
class MarkUserOnboardedHandler {
  constructor(
    @InjectReadRepository(UserEntity)
    private readonly readRepository: Repository<UserEntity>
  ) {}

  async execute(command: MarkUserOnboardedCommand): Promise<void> {
    const projection = await this.readRepository.findOneBy({ id: command.id });
    if (!projection) {
      throw new Error(`Projection '${command.id}' not found`);
    }

    projection.name = `onboarded:${command.id}`;
    await this.readRepository.save(projection);
  }
}

@Service()
@ProcessManager(UserCreatedEvent)
class UserOnboardingProcessManager implements IProcessManager<UserCreatedEvent> {
  async handle(event: UserCreatedEvent, context: any): Promise<void> {
    await context.commandBus.execute(new MarkUserOnboardedCommand(event.id));
  }
}

@Service()
@ProjectionRebuilder("users")
class UserProjectionRebuilder implements IProjectionRebuilder {
  constructor(
    @InjectWriteRepository(UserEntity)
    private readonly writeRepository: Repository<UserEntity>,
    @InjectReadRepository(UserEntity)
    private readonly readRepository: Repository<UserEntity>
  ) {}

  async rebuild(): Promise<void> {
    const users = await this.writeRepository.find({ order: { id: "ASC" } });
    await this.readRepository.clear();
    await this.readRepository.save(
      users.map((user) => this.readRepository.create({ id: user.id, name: user.name }))
    );
  }
}

@Service()
@IdempotentCommand<IdempotentCreateUserCommand>({ key: (command) => command.idempotencyKey })
@CommandHandler(IdempotentCreateUserCommand)
class IdempotentCreateUserHandler {
  public static executions = 0;

  constructor(
    @InjectWriteRepository(UserEntity)
    private readonly writeRepository: Repository<UserEntity>
  ) {}

  async execute(command: IdempotentCreateUserCommand): Promise<string> {
    IdempotentCreateUserHandler.executions += 1;
    await this.writeRepository.save(this.writeRepository.create({ id: command.id, name: command.name }));
    return command.id;
  }
}

@Service()
class CqrsFacade {
  constructor(
    @InjectCommandBus()
    public readonly commandBus: CommandBus,
    @InjectQueryBus()
    public readonly queryBus: QueryBus,
    @InjectReadDataSource()
    public readonly readDataSource: DataSource,
    @InjectWriteDataSource()
    public readonly writeDataSource: DataSource,
    @InjectReadRepository(UserEntity)
    public readonly readRepository: Repository<UserEntity>,
    @InjectWriteRepository(UserEntity)
    public readonly writeRepository: Repository<UserEntity>
  ) {}
}

@Cqrs({
  readDataSourceName: "read-db",
  writeDataSourceName: "write-db",
})
class TestCqrsConfiguration {}

describe("@xtaskjs/cqrs integration", () => {
  beforeEach(async () => {
    void TestCqrsConfiguration;
    await shutdownCqrsIntegration();
    await shutdownTypeOrmIntegration();
    await resetCqrsIntegration();
    configureCqrs({
      readDataSourceName: "read-db",
      writeDataSourceName: "write-db",
    });
    IdempotentCreateUserHandler.executions = 0;
    clearRegisteredTypeOrmDataSources();
  });

  afterEach(async () => {
    await shutdownCqrsIntegration();
    await shutdownTypeOrmIntegration();
    await resetCqrsIntegration();
    clearRegisteredTypeOrmDataSources();
  });

  test("binds command, query, and repository aliases for separate read and write databases", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();

    registerTypeOrmDataSource({
      name: "write-db",
      type: "sqlite",
      database: ":memory:",
      entities: [UserEntity],
      synchronize: true,
    });
    registerTypeOrmDataSource({
      name: "read-db",
      type: "sqlite",
      database: ":memory:",
      entities: [UserEntity],
      synchronize: true,
    });

    for (const type of [CreateUserHandler, ListUsersHandler, UserProjectionHandler, CqrsFacade]) {
      container.registerWithName(type, { scope: "singleton" }, type.name);
    }

    await initializeTypeOrmIntegration(container);
    await initializeCqrsIntegration(container, lifecycle);

    const facade = container.get(CqrsFacade);
    const commandBusByName = container.getByName<CommandBus>(getCommandBusToken());
    const readDataSource = container.getByName<DataSource>(getReadDataSourceToken());
    const writeDataSource = container.getByName<DataSource>(getWriteDataSourceToken());

    expect(facade.commandBus).toBe(commandBusByName);
    expect(facade.readDataSource).toBe(readDataSource);
    expect(facade.writeDataSource).toBe(writeDataSource);
    expect(readDataSource).not.toBe(writeDataSource);

    const createdId = await facade.commandBus.execute<string>(new CreateUserCommand("user-1", "Ada"));
    const users = await facade.queryBus.execute<string[]>(new ListUsersQuery());
    const writeUsers = await facade.writeRepository.find({ order: { id: "ASC" } });
    const readUsers = await facade.readRepository.find({ order: { id: "ASC" } });

    expect(createdId).toBe("user-1");
    expect(users).toEqual(["Ada"]);
    expect(writeUsers.map((user) => user.name)).toEqual(["Ada"]);
    expect(readUsers.map((user) => user.name)).toEqual(["Ada"]);
  });

  test("supports process managers that dispatch follow-up commands", async () => {
    const container = new Container();

    registerTypeOrmDataSource({
      name: "write-db",
      type: "sqlite",
      database: ":memory:",
      entities: [UserEntity],
      synchronize: true,
    });
    registerTypeOrmDataSource({
      name: "read-db",
      type: "sqlite",
      database: ":memory:",
      entities: [UserEntity],
      synchronize: true,
    });

    for (const type of [CreateUserHandler, UserProjectionHandler, MarkUserOnboardedHandler, UserOnboardingProcessManager, CqrsFacade]) {
      container.registerWithName(type, { scope: "singleton" }, type.name);
    }

    await initializeTypeOrmIntegration(container);
    await initializeCqrsIntegration(container);

    const facade = container.get(CqrsFacade);
    await facade.commandBus.execute(new CreateUserCommand("user-2", "Linus"));

    const readUsers = await facade.readRepository.find({ order: { id: "ASC" } });
    expect(readUsers.map((user) => user.name)).toEqual(["onboarded:user-2"]);
  });

  test("supports idempotent command execution with cached results", async () => {
    const container = new Container();

    registerTypeOrmDataSource({
      name: "write-db",
      type: "sqlite",
      database: ":memory:",
      entities: [UserEntity],
      synchronize: true,
    });
    registerTypeOrmDataSource({
      name: "read-db",
      type: "sqlite",
      database: ":memory:",
      entities: [UserEntity],
      synchronize: true,
    });

    for (const type of [IdempotentCreateUserHandler, CqrsFacade]) {
      container.registerWithName(type, { scope: "singleton" }, type.name);
    }

    await initializeTypeOrmIntegration(container);
    await initializeCqrsIntegration(container);

    const facade = container.get(CqrsFacade);
    const first = await facade.commandBus.execute(
      new IdempotentCreateUserCommand("user-3", "Grace", "req-1")
    );
    const second = await facade.commandBus.execute(
      new IdempotentCreateUserCommand("user-4", "Duplicate", "req-1")
    );
    const writeUsers = await facade.writeRepository.find({ order: { id: "ASC" } });

    expect(first).toBe("user-3");
    expect(second).toBe("user-3");
    expect(IdempotentCreateUserHandler.executions).toBe(1);
    expect(writeUsers.map((user) => user.id)).toEqual(["user-3"]);
  });

  test("rebuilds projections from write-side state", async () => {
    const container = new Container();

    registerTypeOrmDataSource({
      name: "write-db",
      type: "sqlite",
      database: ":memory:",
      entities: [UserEntity],
      synchronize: true,
    });
    registerTypeOrmDataSource({
      name: "read-db",
      type: "sqlite",
      database: ":memory:",
      entities: [UserEntity],
      synchronize: true,
    });

    for (const type of [CreateUserHandler, UserProjectionHandler, UserProjectionRebuilder, CqrsFacade]) {
      container.registerWithName(type, { scope: "singleton" }, type.name);
    }

    await initializeTypeOrmIntegration(container);
    await initializeCqrsIntegration(container);

    const facade = container.get(CqrsFacade);
    await facade.commandBus.execute(new CreateUserCommand("user-5", "Ada"));
    await facade.readRepository.clear();

    await getCqrsLifecycleManager().rebuildProjection("users");

    const readUsers = await facade.readRepository.find({ order: { id: "ASC" } });
    expect(readUsers.map((user) => user.name)).toEqual(["Ada"]);
    expect(getCqrsLifecycleManager().listProjectionRebuilders()).toEqual(["users"]);
  });

  test("clears CQRS runtime bindings when lifecycle stops", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();

    registerTypeOrmDataSource({
      name: "write-db",
      type: "sqlite",
      database: ":memory:",
      entities: [UserEntity],
      synchronize: true,
    });
    registerTypeOrmDataSource({
      name: "read-db",
      type: "sqlite",
      database: ":memory:",
      entities: [UserEntity],
      synchronize: true,
    });

    container.registerWithName(CreateUserHandler, { scope: "singleton" }, CreateUserHandler.name);

    await initializeTypeOrmIntegration(container);
    await initializeCqrsIntegration(container, lifecycle);

    expect(container.getByName<CommandBus>(getCommandBusToken())).toBeDefined();

    await lifecycle.emit("stopping");

    await expect(container.getByName<CommandBus>(getCommandBusToken()).execute(new CreateUserCommand("x", "y"))).rejects.toThrow(
      "No CQRS command handler registered for 'CreateUserCommand'"
    );
  });
});