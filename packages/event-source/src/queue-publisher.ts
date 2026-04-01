import { QueuePublishOptions, QueueService } from "@xtaskjs/queues";
import { EventEnvelope, IEventPublisher } from "./types";

export interface QueueEventPublisherOptions {
  queue?: string | ((event: EventEnvelope<any>) => string);
  transportName?: string;
  includeEnvelope?: boolean;
  persistent?: boolean;
  headers?: Record<string, any>;
  metadata?: Record<string, any>;
}

const toSerializableEvent = (event: EventEnvelope<any>) => ({
  ...event,
  occurredAt: event.occurredAt.toISOString(),
});

export class QueueEventPublisher implements IEventPublisher {
  private readonly queues = new QueueService();

  constructor(private readonly options: QueueEventPublisherOptions = {}) {}

  async publish(events: EventEnvelope<any>[]): Promise<void> {
    for (const event of events) {
      const queue = this.resolveQueue(event);
      const publishOptions: QueuePublishOptions = {
        transportName: this.options.transportName,
        persistent: this.options.persistent ?? true,
        headers: {
          ...(this.options.headers || {}),
          "x-xtask-event-source-stream": event.stream,
          "x-xtask-event-source-stream-id": event.streamId,
          "x-xtask-event-source-event": event.eventName,
          "x-xtask-event-source-version": event.version,
        },
        metadata: {
          ...(this.options.metadata || {}),
          aggregateName: event.aggregateName,
          eventName: event.eventName,
          stream: event.stream,
          streamId: event.streamId,
          version: event.version,
        },
      };

      await this.queues.publish(
        queue,
        this.options.includeEnvelope === false ? event.payload : toSerializableEvent(event),
        publishOptions
      );
    }
  }

  private resolveQueue(event: EventEnvelope<any>): string {
    if (typeof this.options.queue === "function") {
      const queue = this.options.queue(event)?.trim();
      if (queue) {
        return queue;
      }
    }

    if (typeof this.options.queue === "string" && this.options.queue.trim()) {
      return this.options.queue.trim();
    }

    return `${event.stream}.${event.eventName}`;
  }
}

export const createQueueEventPublisher = (
  options: QueueEventPublisherOptions = {}
): QueueEventPublisher => new QueueEventPublisher(options);