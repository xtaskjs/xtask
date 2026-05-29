import { Logger } from "@xtaskjs/common";
import { Service } from "@xtaskjs/core";
import {
  EventEnvelope,
  EventSourceRepository,
  IEventStore,
  InjectEventSourceRepository,
  InjectEventStore,
} from "@xtaskjs/event-source";
import { InjectQueueService, QueueService } from "@xtaskjs/queues";
import { InjectRepository, Repository } from "@xtaskjs/typeorm";
import { SchemaDto } from "@xtaskjs/validation";
import { z } from "zod";
import { RabbitMqAuditService } from "./rabbitmq-audit.service";
import { UserAggregate } from "./user.aggregate";
import { UserProjectionEntity } from "./user-projection.entity";

const createUserId = (): string => {
  return `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const serializeEvent = (event: EventEnvelope<any>) => ({
  id: event.id,
  stream: event.stream,
  streamId: event.streamId,
  eventName: event.eventName,
  version: event.version,
  occurredAt: event.occurredAt.toISOString(),
  metadata: event.metadata,
  payload: event.payload,
});

@SchemaDto(
  z.object({
    displayName: z.string().trim().min(2),
    email: z.string().trim().email(),
  })
)
export class RegisterUserRequest {
  displayName!: string;

  email!: string;
}

@Service()
export class EventSourceDemoService {
  constructor(
    private readonly logger: Logger,
    private readonly rabbitMqAudit: RabbitMqAuditService,
    @InjectEventSourceRepository(UserAggregate)
    private readonly users: EventSourceRepository<UserAggregate>,
    @InjectEventStore()
    private readonly store: IEventStore,
    @InjectRepository(UserProjectionEntity, "event-source-db")
    private readonly projections: Repository<UserProjectionEntity>,
    @InjectQueueService()
    private readonly queues: QueueService
  ) {}

  describe() {
    return {
      sample: "21-event_source_rabbitmq_app",
      description: "Event-source sample with SQLite-backed event streams and RabbitMQ-backed delivery.",
      endpoints: [
        "GET /event-source/users",
        "GET /event-source/streams/:id",
        "GET /event-source/status",
        "POST /event-source/users",
        "POST /event-source/users/:id/verify-email",
      ],
      database: process.env.EVENT_SOURCE_DB_PATH || "xtask-event-source.sqlite",
      eventStoreTable: process.env.EVENT_STORE_TABLE || "user_event_store",
      exchange: process.env.AMQP_EXCHANGE || "xtask.samples.event-source",
    };
  }

  async registerUser(request: RegisterUserRequest) {
    const userId = createUserId();
    const aggregate = this.users.create(userId);
    aggregate.register(userId, request.displayName, request.email);
    const events = await this.users.save(aggregate);

    this.logger.info(`Registered event-sourced user ${userId}`);

    return {
      accepted: true,
      user: aggregate.snapshot(),
      events: events.map(serializeEvent),
    };
  }

  async verifyUserEmail(userId: string) {
    const aggregate = await this.users.load(userId);
    aggregate.verifyEmail();
    const events = await this.users.save(aggregate);

    return {
      accepted: true,
      user: aggregate.snapshot(),
      events: events.map(serializeEvent),
    };
  }

  async listUsers() {
    const projections = await this.projections.find({ order: { registeredAt: "ASC" } });
    return projections.map((projection) => ({
      id: projection.id,
      displayName: projection.displayName,
      email: projection.email,
      status: projection.status,
      registeredAt: projection.registeredAt.toISOString(),
      verifiedAt: projection.verifiedAt ? new Date(projection.verifiedAt).toISOString() : null,
      version: projection.version,
    }));
  }

  async inspectStream(userId: string) {
    const aggregate = await this.users.load(userId);
    const stream = await this.store.load("users", userId);
    return {
      aggregate: aggregate.snapshot(),
      stream: stream.map(serializeEvent),
    };
  }

  async getStatus() {
    const projectionCount = await this.projections.count();
    return {
      projections: projectionCount,
      queues: {
        started: this.queues.isStarted(),
        groups: this.queues.listGroups(),
        transports: this.queues.listTransports(),
        consumers: this.queues.listConsumers().map((consumer) => ({
          name: consumer.name,
          queue: consumer.queue,
          pattern: consumer.pattern,
          transportName: consumer.transportName,
          groups: consumer.groups,
          started: consumer.started,
        })),
      },
      brokerAudit: this.rabbitMqAudit.getSnapshot(),
    };
  }
}