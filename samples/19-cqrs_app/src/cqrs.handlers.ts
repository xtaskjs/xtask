import { Service } from "@xtaskjs/core";
import {
  CommandHandler,
  EventHandler,
  EventBus,
  IdempotentCommand,
  ICommandHandler,
  IEventHandler,
  InjectCqrsLifecycleManager,
  InjectEventBus,
  InjectReadRepository,
  InjectWriteRepository,
  IProcessManager,
  IProjectionRebuilder,
  IQueryHandler,
  ProcessManager,
  ProcessManagerContext,
  ProjectionRebuilder,
  QueryHandler,
} from "@xtaskjs/cqrs";
import { Repository } from "@xtaskjs/typeorm";
import {
  CreateUserCommand,
  InspectCqrsStateQuery,
  ListUsersQuery,
  MarkUserOnboardedCommand,
  UserCreatedEvent,
} from "./messages";
import { UserProjectionEntity } from "./user-projection.entity";
import { UserWriteEntity } from "./user-write.entity";

const toIsoString = (value: Date | string): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
};

type UserProjectionView = {
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
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, UserProjectionView> {
  constructor(
    @InjectWriteRepository(UserWriteEntity)
    private readonly writeRepository: Repository<UserWriteEntity>,
    @InjectEventBus()
    private readonly eventBus: EventBus
  ) {}

  async execute(command: CreateUserCommand): Promise<UserProjectionView> {
    const entity = this.writeRepository.create({
      displayName: command.displayName.trim(),
      email: command.email.trim().toLowerCase(),
    });

    const saved = await this.writeRepository.save(entity);

    await this.eventBus.publish(
      new UserCreatedEvent(saved.id, saved.displayName, saved.email, saved.createdAt)
    );

    return {
      id: saved.id,
      displayName: saved.displayName,
      email: saved.email,
      createdAt: toIsoString(saved.createdAt),
      status: "accepted",
    };
  }
}

@Service()
@EventHandler(UserCreatedEvent)
export class UserProjectionHandler implements IEventHandler<UserCreatedEvent> {
  constructor(
    @InjectReadRepository(UserProjectionEntity)
    private readonly projectionRepository: Repository<UserProjectionEntity>
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    const projection = this.projectionRepository.create({
      id: event.id,
      displayName: event.displayName,
      email: event.email,
      createdAt: event.createdAt,
      status: "ready",
    });

    await this.projectionRepository.save(projection);
  }
}

@Service()
@CommandHandler(MarkUserOnboardedCommand)
export class MarkUserOnboardedHandler implements ICommandHandler<MarkUserOnboardedCommand, void> {
  constructor(
    @InjectReadRepository(UserProjectionEntity)
    private readonly projectionRepository: Repository<UserProjectionEntity>
  ) {}

  async execute(command: MarkUserOnboardedCommand): Promise<void> {
    const projection = await this.projectionRepository.findOneBy({ id: command.id });
    if (!projection) {
      throw new Error(`Projection '${command.id}' not found`);
    }

    projection.status = "onboarded";
    await this.projectionRepository.save(projection);
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
@ProjectionRebuilder("users")
export class UserProjectionRebuilder implements IProjectionRebuilder {
  constructor(
    @InjectWriteRepository(UserWriteEntity)
    private readonly writeRepository: Repository<UserWriteEntity>,
    @InjectReadRepository(UserProjectionEntity)
    private readonly projectionRepository: Repository<UserProjectionEntity>
  ) {}

  async rebuild(): Promise<void> {
    const writeModels = await this.writeRepository.find({ order: { id: "ASC" } });

    await this.projectionRepository.clear();
    await this.projectionRepository.save(
      writeModels.map((writeModel) =>
        this.projectionRepository.create({
          id: writeModel.id,
          displayName: writeModel.displayName,
          email: writeModel.email,
          createdAt: writeModel.createdAt,
          status: "rebuilt",
        })
      )
    );
  }
}

@Service()
@QueryHandler(ListUsersQuery)
export class ListUsersHandler implements IQueryHandler<ListUsersQuery, UserProjectionView[]> {
  constructor(
    @InjectReadRepository(UserProjectionEntity)
    private readonly projectionRepository: Repository<UserProjectionEntity>
  ) {}

  async execute(): Promise<UserProjectionView[]> {
    const projections = await this.projectionRepository.find({ order: { id: "ASC" } });

    return projections.map((projection) => ({
      id: projection.id,
      displayName: projection.displayName,
      email: projection.email,
      createdAt: toIsoString(projection.createdAt),
      status: projection.status,
    }));
  }
}

@Service()
@QueryHandler(InspectCqrsStateQuery)
export class InspectCqrsStateHandler implements IQueryHandler<InspectCqrsStateQuery, any> {
  constructor(
    @InjectWriteRepository(UserWriteEntity)
    private readonly writeRepository: Repository<UserWriteEntity>,
    @InjectReadRepository(UserProjectionEntity)
    private readonly projectionRepository: Repository<UserProjectionEntity>,
    @InjectCqrsLifecycleManager()
    private readonly cqrs: any
  ) {}

  async execute(): Promise<any> {
    const [writeRows, readRows] = await Promise.all([
      this.writeRepository.find({ order: { id: "ASC" } }),
      this.projectionRepository.find({ order: { id: "ASC" } }),
    ]);

    return {
      writeDatabase: process.env.WRITE_DB_PATH || "xtask-cqrs-write.sqlite",
      readDatabase: process.env.READ_DB_PATH || "xtask-cqrs-read.sqlite",
      projectionRebuilders: this.cqrs.listProjectionRebuilders(),
      writeModelCount: writeRows.length,
      projectionCount: readRows.length,
      writeModels: writeRows.map((row) => ({
        id: row.id,
        displayName: row.displayName,
        email: row.email,
        createdAt: toIsoString(row.createdAt),
      })),
      projections: readRows.map((row) => ({
        id: row.id,
        displayName: row.displayName,
        email: row.email,
        createdAt: toIsoString(row.createdAt),
        status: row.status,
      })),
    };
  }
}