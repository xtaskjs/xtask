import { Service } from "@xtaskjs/core";
import {
  EventSourceSubscriber,
  IEventSourceSubscriber,
} from "@xtaskjs/event-source";
import { EventBus, InjectEventBus } from "@xtaskjs/cqrs";
import { UserEmailVerifiedEvent, UserRegisteredEvent } from "./user.events";

@Service()
@EventSourceSubscriber([UserRegisteredEvent, UserEmailVerifiedEvent])
export class EventSourceToCqrsBridgeSubscriber
  implements IEventSourceSubscriber<UserRegisteredEvent | UserEmailVerifiedEvent>
{
  constructor(
    @InjectEventBus()
    private readonly eventBus: EventBus
  ) {}

  async handle(event: UserRegisteredEvent | UserEmailVerifiedEvent): Promise<void> {
    await this.eventBus.publish(event);
  }
}