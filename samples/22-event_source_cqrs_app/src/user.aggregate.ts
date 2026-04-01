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
  public status = "pending";
  public registeredAt?: Date;
  public verifiedAt?: Date;

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
      status: this.status,
      registeredAt: this.registeredAt?.toISOString(),
      verifiedAt: this.verifiedAt?.toISOString(),
      version: this.getVersion(),
    };
  }

  @ApplyEvent(UserRegisteredEvent)
  onRegistered(event: UserRegisteredEvent): void {
    this.displayName = event.displayName;
    this.email = event.email;
    this.status = "registered";
    this.registeredAt = new Date(event.registeredAt);
  }

  @ApplyEvent(UserEmailVerifiedEvent)
  onVerified(event: UserEmailVerifiedEvent): void {
    this.status = "verified";
    this.verifiedAt = new Date(event.verifiedAt);
  }
}