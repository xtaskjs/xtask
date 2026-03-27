import { Service } from "@xtaskjs/core";
import {
  CommandHandler,
  EventBus,
  EventHandler,
  IdempotentCommand,
  ICommandHandler,
  IEventHandler,
  InjectCqrsLifecycleManager,
  InjectEventBus,
  InjectReadDataSource,
  InjectReadRepository,
  InjectWriteDataSource,
  InjectWriteRepository,
  IProcessManager,
  IProjectionRebuilder,
  IQueryHandler,
  ProcessManager,
  ProcessManagerContext,
  ProjectionRebuilder,
  QueryHandler,
} from "@xtaskjs/cqrs";
import { DataSource, Repository } from "@xtaskjs/typeorm";
import {
  CreateUserCommand,
  InspectReplicationStateQuery,
  ListUsersQuery,
  MarkUserOnboardedCommand,
  UserCreatedEvent,
  UserRenamedEvent,
  RenameUserCommand,
} from "./messages";
import { UserProjectionEntity } from "./user-projection.entity";
import { UserWriteEntity } from "./user-write.entity";

const toIsoString = (value: Date | string): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
};

type ProjectionView = {
  id: number;
  displayName: string;
  email: string;
  createdAt: string;
  status: string;
};

@Service()
@IdempotentCommand<CreateUserCommand>({
  key: (command) => command.requestId || command.email.trim().toLowerCase(),
})
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, ProjectionView> {
  constructor(
    @InjectWriteRepository(UserWriteEntity)
    private readonly users: Repository<UserWriteEntity>,
    @InjectEventBus()
    private readonly eventBus: EventBus
  ) {}

  async execute(command: CreateUserCommand): Promise<ProjectionView> {
    const entity = this.users.create({
      displayName: command.displayName.trim(),
      email: command.email.trim().toLowerCase(),
    });

    const saved = await this.users.save(entity);

    await this.eventBus.publish(
      new UserCreatedEvent(saved.id, saved.displayName, saved.email, saved.createdAt)
    );

    return {
      id: saved.id,
      displayName: saved.displayName,
      email: saved.email,
      createdAt: toIsoString(saved.createdAt),
      status: "accepted-by-master",
    };
  }
}

@Service()
@IdempotentCommand<RenameUserCommand>({
  key: (command) => command.requestId || `${command.id}:${command.displayName.trim().toLowerCase()}`,
})
@CommandHandler(RenameUserCommand)
export class RenameUserHandler implements ICommandHandler<RenameUserCommand, ProjectionView> {
  constructor(
    @InjectWriteRepository(UserWriteEntity)
    private readonly users: Repository<UserWriteEntity>,
    @InjectEventBus()
    private readonly eventBus: EventBus
  ) {}

  async execute(command: RenameUserCommand): Promise<ProjectionView> {
    const user = await this.users.findOneBy({ id: command.id });
    if (!user) {
      throw new Error(`User '${command.id}' not found on master`);
    }

    user.displayName = command.displayName.trim();
    const saved = await this.users.save(user);

    await this.eventBus.publish(new UserRenamedEvent(saved.id, saved.displayName));

    return {
      id: saved.id,
      displayName: saved.displayName,
      email: saved.email,
      createdAt: toIsoString(saved.createdAt),
      status: "renamed-on-master",
    };
  }
}

@Service()
@EventHandler(UserCreatedEvent)
export class UserProjectionHandler implements IEventHandler<UserCreatedEvent> {
  constructor(
    @InjectWriteRepository(UserProjectionEntity)
    private readonly projections: Repository<UserProjectionEntity>
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    await this.projections.save(
      this.projections.create({
        id: event.id,
        displayName: event.displayName,
        email: event.email,
        createdAt: event.createdAt,
        status: "ready",
      })
    );
  }
}

@Service()
@EventHandler(UserRenamedEvent)
export class UserRenameProjectionHandler implements IEventHandler<UserRenamedEvent> {
  constructor(
    @InjectWriteRepository(UserProjectionEntity)
    private readonly projections: Repository<UserProjectionEntity>
  ) {}

  async handle(event: UserRenamedEvent): Promise<void> {
    const projection = await this.projections.findOneBy({ id: event.id });
    if (!projection) {
      throw new Error(`Projection '${event.id}' not found on master`);
    }

    projection.displayName = event.displayName;
    projection.status = "renamed";
    await this.projections.save(projection);
  }
}

@Service()
@CommandHandler(MarkUserOnboardedCommand)
export class MarkUserOnboardedHandler implements ICommandHandler<MarkUserOnboardedCommand, void> {
  constructor(
    @InjectWriteRepository(UserProjectionEntity)
    private readonly projections: Repository<UserProjectionEntity>
  ) {}

  async execute(command: MarkUserOnboardedCommand): Promise<void> {
    const projection = await this.projections.findOneBy({ id: command.id });
    if (!projection) {
      throw new Error(`Projection '${command.id}' not found on master`);
    }

    projection.status = "onboarded";
    await this.projections.save(projection);
  }
}

@Service()
@ProcessManager(UserCreatedEvent)
export class UserOnboardingProcessManager implements IProcessManager<UserCreatedEvent> {
  async handle(event: UserCreatedEvent, context: ProcessManagerContext): Promise<void> {
    await context.commandBus.execute(new MarkUserOnboardedCommand(event.id));
  }
}

@Service()
@ProjectionRebuilder("user_projection")
export class UserProjectionRebuilder implements IProjectionRebuilder {
  constructor(
    @InjectWriteRepository(UserWriteEntity)
    private readonly users: Repository<UserWriteEntity>,
    @InjectWriteRepository(UserProjectionEntity)
    private readonly projections: Repository<UserProjectionEntity>
  ) {}

  async rebuild(): Promise<void> {
    const rows = await this.users.find({ order: { id: "ASC" } });

    await this.projections.clear();
    await this.projections.save(
      rows.map((row) =>
        this.projections.create({
          id: row.id,
          displayName: row.displayName,
          email: row.email,
          createdAt: row.createdAt,
          status: "rebuilt-on-master",
        })
      )
    );
  }
}

@Service()
@QueryHandler(ListUsersQuery)
export class ListUsersHandler implements IQueryHandler<ListUsersQuery, ProjectionView[]> {
  constructor(
    @InjectReadRepository(UserProjectionEntity)
    private readonly projections: Repository<UserProjectionEntity>
  ) {}

  async execute(): Promise<ProjectionView[]> {
    const rows = await this.projections.find({ order: { id: "ASC" } });
    return rows.map((row) => ({
      id: row.id,
      displayName: row.displayName,
      email: row.email,
      createdAt: toIsoString(row.createdAt),
      status: row.status,
    }));
  }
}

@Service()
@QueryHandler(InspectReplicationStateQuery)
export class InspectReplicationStateHandler implements IQueryHandler<InspectReplicationStateQuery, any> {
  constructor(
    @InjectWriteDataSource()
    private readonly masterDataSource: DataSource,
    @InjectReadDataSource()
    private readonly slaveDataSource: DataSource,
    @InjectWriteRepository(UserWriteEntity)
    private readonly users: Repository<UserWriteEntity>,
    @InjectWriteRepository(UserProjectionEntity)
    private readonly masterProjections: Repository<UserProjectionEntity>,
    @InjectReadRepository(UserProjectionEntity)
    private readonly slaveProjections: Repository<UserProjectionEntity>,
    @InjectCqrsLifecycleManager()
    private readonly cqrs: any
  ) {}

  async execute(): Promise<any> {
    const [masterRows, masterProjectionRows, slaveProjectionRows, masterInfo, slaveInfo] = await Promise.all([
      this.users.find({ order: { id: "ASC" } }),
      this.masterProjections.find({ order: { id: "ASC" } }),
      this.slaveProjections.find({ order: { id: "ASC" } }),
      this.describeServer(this.masterDataSource),
      this.describeServer(this.slaveDataSource),
    ]);

    return {
      rebuilderNames: this.cqrs.listProjectionRebuilders(),
      master: {
        role: masterInfo.inRecovery ? "unexpected-replica" : "master",
        connection: masterInfo,
        writeModelCount: masterRows.length,
        projectionCount: masterProjectionRows.length,
      },
      slave: {
        role: slaveInfo.inRecovery ? "slave" : "unexpected-master",
        connection: slaveInfo,
        projectionCount: slaveProjectionRows.length,
      },
      writeModels: masterRows.map((row) => ({
        id: row.id,
        displayName: row.displayName,
        email: row.email,
        createdAt: toIsoString(row.createdAt),
      })),
      masterProjections: masterProjectionRows.map((row) => ({
        id: row.id,
        displayName: row.displayName,
        email: row.email,
        status: row.status,
        createdAt: toIsoString(row.createdAt),
      })),
      slaveProjections: slaveProjectionRows.map((row) => ({
        id: row.id,
        displayName: row.displayName,
        email: row.email,
        status: row.status,
        createdAt: toIsoString(row.createdAt),
      })),
    };
  }

  private async describeServer(dataSource: DataSource): Promise<any> {
    const [row] = await dataSource.query(
      "SELECT inet_server_addr()::text AS host, inet_server_port() AS port, pg_is_in_recovery() AS in_recovery"
    );

    return {
      host: row?.host,
      port: Number(row?.port),
      inRecovery: row?.in_recovery === true || row?.in_recovery === "t",
    };
  }
}