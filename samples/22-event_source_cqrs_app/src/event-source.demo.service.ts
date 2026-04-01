import { Service } from "@xtaskjs/core";
import {
  EventEnvelope,
  EventSourceRepository,
  IEventStore,
  InjectEventSourceRepository,
  InjectEventStore,
} from "@xtaskjs/event-source";
import { IsEmail, IsString, MinLength } from "class-validator";
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

export class RegisterUserRequest {
  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsEmail()
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