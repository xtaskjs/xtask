import {
  ApplyEvent,
  EventSourcedAggregate,
  EventSourcedAggregateRoot,
} from "@xtaskjs/event-source";
import { UserEmailVerifiedEvent, UserRegisteredEvent } from "./user.events";

@EventSourcedAggregate({ stream: "users" })
export class UserAggregate extends EventSourcedAggregateRoot {
  public displayName?: string;
  public email?: string;
  public registeredAt?: Date;
  public verifiedAt?: Date;
  public status = "pending";

  register(id: string, displayName: string, email: string): void {
    if (this.getVersion() > 0) {
      throw new Error(`User aggregate '${id}' is already registered`);
    }

    this.assignStreamId(id);
    this.raiseEvent(
      new UserRegisteredEvent(
        id,
        displayName.trim(),
        email.trim().toLowerCase(),
        new Date()
      )
    );
  }

  verifyEmail(): void {
    const streamId = this.getStreamId();
    if (!streamId) {
      throw new Error("Cannot verify a user without a stream id");
    }

    if (this.verifiedAt) {
      return;
    }

    this.raiseEvent(new UserEmailVerifiedEvent(streamId, new Date()));
  }

  snapshot() {
    return {
      id: this.getStreamId(),
      displayName: this.displayName,
      email: this.email,
      registeredAt: this.registeredAt?.toISOString(),
      verifiedAt: this.verifiedAt?.toISOString(),
      status: this.status,
      version: this.getVersion(),
    };
  }

  @ApplyEvent(UserRegisteredEvent)
  onRegistered(event: UserRegisteredEvent): void {
    this.displayName = event.displayName;
    this.email = event.email;
    this.registeredAt = new Date(event.registeredAt);
    this.status = "registered";
  }

  @ApplyEvent(UserEmailVerifiedEvent)
  onEmailVerified(event: UserEmailVerifiedEvent): void {
    this.verifiedAt = new Date(event.verifiedAt);
    this.status = "verified";
  }
}