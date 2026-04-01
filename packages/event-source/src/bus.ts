import { EventEnvelope } from "./types";

export class EventSourceBus {
  constructor(
    private readonly dispatch: (events: EventEnvelope<any>[]) => Promise<void>
  ) {}

  async publish(event: EventEnvelope<any> | EventEnvelope<any>[]): Promise<void> {
    const events = Array.isArray(event) ? event : [event];
    await this.dispatch(events);
  }
}