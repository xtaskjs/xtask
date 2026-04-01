import { Service } from "@xtaskjs/core";
import { QueueHandlerContext, QueuePattern } from "@xtaskjs/queues";

@Service()
export class RabbitMqAuditService {
  private readonly deliveries: string[] = [];
  private readonly counters = new Map<string, number>();

  @QueuePattern("domain.users.*", {
    name: "sample.event-source.rabbitmq.audit",
    transportName: "rabbitmq",
    group: ["event-source", "rabbitmq"],
  })
  onDomainUserEvent(
    payload: {
      eventName?: string;
      streamId?: string;
      version?: number;
      payload?: { id?: string };
    },
    context: QueueHandlerContext
  ) {
    const eventName = payload.eventName || "unknown";
    const streamId = payload.streamId || payload.payload?.id || "unknown";
    const entry = `${context.queue}:${streamId}:v${payload.version ?? 0}`;
    this.deliveries.push(entry);
    if (this.deliveries.length > 40) {
      this.deliveries.shift();
    }

    this.counters.set(eventName, (this.counters.get(eventName) || 0) + 1);
  }

  getSnapshot() {
    return {
      deliveries: [...this.deliveries],
      counters: Object.fromEntries(this.counters.entries()),
    };
  }
}