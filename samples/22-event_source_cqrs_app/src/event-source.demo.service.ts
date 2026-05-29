import { Service } from "@xtaskjs/core";
import {
  EventEnvelope,
  EventSourceRepository,
  IEventStore,
  InjectEventSourceRepository,
  InjectEventStore,
} from "@xtaskjs/event-source";
import { SchemaDto } from "@xtaskjs/validation";
import { z } from "zod";
import { UserAggregate } from "./user.aggregate";

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
    @InjectEventSourceRepository(UserAggregate)
    private readonly users: EventSourceRepository<UserAggregate>,
    @InjectEventStore()
    private readonly store: IEventStore
  ) {}

  async registerUser(request: RegisterUserRequest) {
    const id = createUserId();
    const aggregate = this.users.create(id);
    aggregate.register(id, request.displayName, request.email);
    const events = await this.users.save(aggregate);

    return {
      accepted: true,
      aggregate: aggregate.snapshot(),
      events: events.map(serializeEvent),
    };
  }

  async verifyUserEmail(id: string) {
    const aggregate = await this.users.load(id);
    aggregate.verifyEmail();
    const events = await this.users.save(aggregate);

    return {
      accepted: true,
      aggregate: aggregate.snapshot(),
      events: events.map(serializeEvent),
    };
  }

  async inspectStream(id: string) {
    const aggregate = await this.users.load(id);
    const stream = await this.store.load("users", id);

    return {
      aggregate: aggregate.snapshot(),
      stream: stream.map(serializeEvent),
    };
  }
}