import { Service } from "@xtaskjs/core";
import {
  EventHandler,
  IEventHandler,
  IQueryHandler,
  InjectCqrsLifecycleManager,
  InjectQueryBus,
  InjectReadRepository,
  QueryBus,
  QueryHandler,
} from "@xtaskjs/cqrs";
import { Repository } from "@xtaskjs/typeorm";
import { InspectInteropStateQuery, ListUsersQuery } from "./queries";
import { UserProjectionEntity } from "./user-projection.entity";
import { UserEmailVerifiedEvent, UserRegisteredEvent } from "./user.events";

const toIsoString = (value: Date | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
};

@Service()
@EventHandler(UserRegisteredEvent)
export class UserRegisteredProjectionHandler implements IEventHandler<UserRegisteredEvent> {
  constructor(
    @InjectReadRepository(UserProjectionEntity)
    private readonly projectionRepository: Repository<UserProjectionEntity>
  ) {}

  async handle(event: UserRegisteredEvent): Promise<void> {
    const projection = this.projectionRepository.create({
      id: event.id,
      displayName: event.displayName,
      email: event.email,
      status: "registered",
      registeredAt: event.registeredAt,
      verifiedAt: null,
      version: 1,
    });

    await this.projectionRepository.save(projection);
  }
}

@Service()
@EventHandler(UserEmailVerifiedEvent)
export class UserVerifiedProjectionHandler implements IEventHandler<UserEmailVerifiedEvent> {
  constructor(
    @InjectReadRepository(UserProjectionEntity)
    private readonly projectionRepository: Repository<UserProjectionEntity>
  ) {}

  async handle(event: UserEmailVerifiedEvent): Promise<void> {
    const projection = await this.projectionRepository.findOneBy({ id: event.id });
    if (!projection) {
      throw new Error(`Projection '${event.id}' not found`);
    }

    projection.status = "verified";
    projection.verifiedAt = event.verifiedAt;
    projection.version += 1;
    await this.projectionRepository.save(projection);
  }
}

@Service()
@QueryHandler(ListUsersQuery)
export class ListUsersHandler implements IQueryHandler<ListUsersQuery, any[]> {
  constructor(
    @InjectReadRepository(UserProjectionEntity)
    private readonly projectionRepository: Repository<UserProjectionEntity>
  ) {}

  async execute(): Promise<any[]> {
    const projections = await this.projectionRepository.find({ order: { registeredAt: "ASC" } });
    return projections.map((projection) => ({
      id: projection.id,
      displayName: projection.displayName,
      email: projection.email,
      status: projection.status,
      registeredAt: toIsoString(projection.registeredAt),
      verifiedAt: toIsoString(projection.verifiedAt),
      version: projection.version,
    }));
  }
}

@Service()
@QueryHandler(InspectInteropStateQuery)
export class InspectInteropStateHandler implements IQueryHandler<InspectInteropStateQuery, any> {
  constructor(
    @InjectReadRepository(UserProjectionEntity)
    private readonly projectionRepository: Repository<UserProjectionEntity>,
    @InjectCqrsLifecycleManager()
    private readonly cqrs: any
  ) {}

  async execute(): Promise<any> {
    const projections = await this.projectionRepository.find({ order: { registeredAt: "ASC" } });

    return {
      writeDatabase: process.env.EVENT_SOURCE_DB_PATH || "xtask-event-source-cqrs-write.sqlite",
      readDatabase: process.env.READ_DB_PATH || "xtask-event-source-cqrs-read.sqlite",
      projectionRebuilders: this.cqrs.listProjectionRebuilders(),
      projectionCount: projections.length,
      projections: projections.map((projection) => ({
        id: projection.id,
        displayName: projection.displayName,
        email: projection.email,
        status: projection.status,
        registeredAt: toIsoString(projection.registeredAt),
        verifiedAt: toIsoString(projection.verifiedAt),
        version: projection.version,
      })),
    };
  }
}

@Service()
export class InteropQueryFacade {
  constructor(
    @InjectQueryBus()
    public readonly queryBus: QueryBus
  ) {}
}