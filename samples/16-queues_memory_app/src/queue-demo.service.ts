import { Logger } from "@xtaskjs/common";
import { Service } from "@xtaskjs/core";
import {
  InjectQueueService,
  PublishToQueue,
  QueueHandler,
  QueueHandlerContext,
  QueuePattern,
  QueueService,
} from "@xtaskjs/queues";

export interface CreateOrderRequest {
  orderId?: string;
  customerId?: string;
  priority?: string;
}

@Service()
export class QueueDemoService {
  private createdCount = 0;
  private completedCount = 0;
  private notificationCount = 0;
  private auditCount = 0;
  private readonly events: string[] = [];

  constructor(
    private readonly logger: Logger,
    @InjectQueueService()
    private readonly queues: QueueService
  ) {}

  async publishOrder(request: CreateOrderRequest = {}) {
    const orderId = request.orderId?.trim() || `order-${Date.now()}`;
    const payload = {
      orderId,
      customerId: request.customerId?.trim() || "walk-in",
      priority: request.priority?.trim() || "normal",
      createdAt: new Date().toISOString(),
    };

    await this.queues.publish("orders.created", payload, {
      transportName: "memory",
      metadata: {
        source: "queues.controller",
      },
    });

    this.record(`published:orders.created:${payload.orderId}`);

    return {
      accepted: true,
      queue: "orders.created",
      payload,
    };
  }

  @PublishToQueue("orders.completed", {
    transportName: "memory",
  })
  completeOrder(orderId: string) {
    const payload = {
      orderId,
      completedAt: new Date().toISOString(),
      source: "publish-decorator",
    };

    this.record(`published:orders.completed:${orderId}`);
    return payload;
  }

  @QueueHandler("orders.created", {
    name: "sample.orders.created",
    transportName: "memory",
    group: ["orders", "demo"],
  })
  async onOrderCreated(
    payload: { orderId: string; customerId: string; priority: string },
    context: QueueHandlerContext
  ) {
    this.createdCount += 1;
    this.record(`handled:${context.queue}:${payload.orderId}:attempt-${context.attempt}`);
    this.logger.info(`Processed order ${payload.orderId} for ${payload.customerId}`);

    await context.publish("notifications.email", {
      orderId: payload.orderId,
      template: "order-created",
      requestedAt: new Date().toISOString(),
    });
  }

  @QueueHandler("orders.completed", {
    name: "sample.orders.completed",
    transportName: "memory",
    group: ["orders", "demo"],
  })
  onOrderCompleted(
    payload: { orderId: string; completedAt: string },
    context: QueueHandlerContext
  ) {
    this.completedCount += 1;
    this.record(`handled:${context.queue}:${payload.orderId}:${payload.completedAt}`);
    this.logger.info(`Completed order ${payload.orderId}`);
  }

  @QueueHandler("notifications.email", {
    name: "sample.notifications.email",
    transportName: "memory",
    group: "notifications",
  })
  onNotificationQueued(
    payload: { orderId: string; template: string },
    context: QueueHandlerContext
  ) {
    this.notificationCount += 1;
    this.record(`handled:${context.queue}:${payload.orderId}:${payload.template}`);
  }

  @QueuePattern("orders.*", {
    name: "sample.orders.audit",
    transportName: "memory",
    group: "audit",
  })
  onOrderPattern(payload: { orderId?: string }, context: QueueHandlerContext) {
    this.auditCount += 1;
    this.record(`pattern:${context.queue}:${payload.orderId || "unknown"}`);
  }

  getSnapshot() {
    return {
      started: this.queues.isStarted(),
      groups: this.queues.listGroups(),
      transports: this.queues.listTransports(),
      consumers: this.queues.listConsumers().map((consumer) => ({
        name: consumer.name,
        queue: consumer.queue,
        pattern: consumer.pattern,
        transportName: consumer.transportName,
        groups: consumer.groups,
        started: consumer.started,
        consumerPolicy: consumer.consumerPolicy,
      })),
      counters: {
        createdCount: this.createdCount,
        completedCount: this.completedCount,
        notificationCount: this.notificationCount,
        auditCount: this.auditCount,
      },
      events: [...this.events],
    };
  }

  private record(event: string) {
    this.events.push(`${new Date().toISOString()} ${event}`);
    if (this.events.length > 25) {
      this.events.shift();
    }
  }
}