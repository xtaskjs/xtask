import { EventSourcedAggregateRoot } from "./aggregate";
import { getEventSourcedAggregateMetadata } from "./metadata";
import { EventSourceLifecycleManager } from "./lifecycle";
import { EventEnvelope, EventSourceRepositorySaveOptions } from "./types";

export class EventSourceRepository<
  TAggregate extends EventSourcedAggregateRoot
> {
  constructor(
    private readonly aggregateType: new () => TAggregate,
    private readonly lifecycle: EventSourceLifecycleManager
  ) {}

  create(streamId: string): TAggregate {
    const aggregate = this.createAggregate(streamId);
    aggregate.assignStreamId(streamId);
    return aggregate;
  }

  async load(streamId: string): Promise<TAggregate> {
    const aggregate = this.createAggregate(streamId);
    const metadata = this.getMetadata();
    const history = await this.lifecycle.getStore().load(metadata.stream, streamId);

    if (history.length === 0) {
      throw new Error(
        `No event stream found for aggregate '${metadata.name}' and id '${streamId}'`
      );
    }

    aggregate.loadFromHistory(history);
    return aggregate;
  }

  async loadOrCreate(streamId: string): Promise<TAggregate> {
    const metadata = this.getMetadata();
    const history = await this.lifecycle.getStore().load(metadata.stream, streamId);
    const aggregate = this.createAggregate(streamId);
    if (history.length > 0) {
      aggregate.loadFromHistory(history);
    }
    return aggregate;
  }

  async save(
    aggregate: TAggregate,
    options: EventSourceRepositorySaveOptions = {}
  ): Promise<EventEnvelope<any>[]> {
    const metadata = this.getMetadata();
    const streamId = aggregate.getStreamId();
    if (!streamId) {
      throw new Error(
        `Aggregate '${metadata.name}' must have a stream id before it can be saved`
      );
    }

    const pendingEvents = aggregate.getUncommittedEvents();
    if (pendingEvents.length === 0) {
      return [];
    }

    const events = await this.lifecycle.getStore().append({
      aggregateName: metadata.name,
      stream: metadata.stream,
      streamId,
      expectedVersion: options.expectedVersion ?? aggregate.getVersion(),
      events: pendingEvents,
    });

    aggregate.markEventsCommitted(events);
    await this.lifecycle.publish(events);
    return events;
  }

  private createAggregate(streamId: string): TAggregate {
    const aggregate = new this.aggregateType();
    if (!(aggregate instanceof EventSourcedAggregateRoot)) {
      throw new Error(
        `Aggregate '${this.aggregateType.name || "anonymous"}' must extend EventSourcedAggregateRoot`
      );
    }

    aggregate.assignStreamId(streamId);
    return aggregate;
  }

  private getMetadata() {
    const metadata = getEventSourcedAggregateMetadata(this.aggregateType);
    if (!metadata) {
      throw new Error(
        `Aggregate '${this.aggregateType.name || "anonymous"}' is not decorated with @EventSourcedAggregate`
      );
    }

    return metadata;
  }
}