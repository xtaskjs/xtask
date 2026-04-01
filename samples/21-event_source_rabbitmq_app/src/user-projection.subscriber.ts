import { Logger } from "@xtaskjs/common";
import { Service } from "@xtaskjs/core";
import {
  EventEnvelope,
  EventSourceSubscriber,
  IEventSourceSubscriber,
} from "@xtaskjs/event-source";
import { InjectRepository, Repository } from "@xtaskjs/typeorm";
import { UserProjectionEntity } from "./user-projection.entity";
import { UserEmailVerifiedEvent, UserRegisteredEvent } from "./user.events";

@Service()
@EventSourceSubscriber([UserRegisteredEvent, UserEmailVerifiedEvent])
export class UserProjectionSubscriber
  implements IEventSourceSubscriber<UserRegisteredEvent | UserEmailVerifiedEvent>
{
  constructor(
    private readonly logger: Logger,
    @InjectRepository(UserProjectionEntity, "event-source-db")
    private readonly projections: Repository<UserProjectionEntity>
  ) {}

  async handle(
    event: UserRegisteredEvent | UserEmailVerifiedEvent,
    envelope: EventEnvelope<UserRegisteredEvent | UserEmailVerifiedEvent>
  ): Promise<void> {
    if (envelope.eventName === UserRegisteredEvent.name) {
      const projection = this.projections.create({
        id: (event as UserRegisteredEvent).id,
        displayName: (event as UserRegisteredEvent).displayName,
        email: (event as UserRegisteredEvent).email,
        status: "registered",
        registeredAt: new Date((event as UserRegisteredEvent).registeredAt),
        verifiedAt: null,
        version: envelope.version,
      });

      await this.projections.save(projection);
      this.logger.info(`Projected registration for ${(event as UserRegisteredEvent).id}`);
      return;
    }

    const verifiedEvent = event as UserEmailVerifiedEvent;
    const projection = await this.projections.findOneBy({ id: verifiedEvent.id });
    if (!projection) {
      throw new Error(`Projection '${verifiedEvent.id}' not found for verification event`);
    }

    projection.status = "verified";
    projection.verifiedAt = new Date(verifiedEvent.verifiedAt);
    projection.version = envelope.version;
    await this.projections.save(projection);
    this.logger.info(`Projected verification for ${verifiedEvent.id}`);
  }
}