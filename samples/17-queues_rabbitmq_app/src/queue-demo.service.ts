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
  simulateFailure?: boolean;
}

@Service()
export class QueueDemoService {
  private createdCount = 0;
  private completedCount = 0;
  private notificationCount = 0;
  private auditCount = 0;
  private retryCount = 0;
  private deadLetterCount = 0;
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
      simulateFailure: request.simulateFailure === true,
      createdAt: new Date().toISOString(),
    };

    await this.queues.publish("orders.created", payload, {
      transportName: "rabbitmq",
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

  async publishFailingOrder(orderId: string) {
    return this.publishOrder({
      orderId,
      customerId: "retry-demo",
      priority: "high",
      simulateFailure: true,
    });
  }

  @PublishToQueue("orders.completed", {
    transportName: "rabbitmq",
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
    name: "sample.rabbit.orders.created",
    transportName: "rabbitmq",
    group: ["orders", "rabbitmq"],
    maxRetries: 1,
    retryDelay: "1500ms",
    deadLetterQueue: "orders.dead",
    deadLetterTransportName: "rabbitmq",
  })
  async onOrderCreated(
    payload: {
      orderId: string;
      customerId: string;
      priority: string;
      simulateFailure?: boolean;
    },
    context: QueueHandlerContext
  ) {
    if (payload.simulateFailure && context.attempt === 0) {
      this.retryCount += 1;
      this.record(`retry-requested:${payload.orderId}:attempt-${context.attempt}`);
      this.logger.warn(`Simulating RabbitMQ consumer failure for ${payload.orderId}`);
      throw new Error("simulated rabbitmq consumer failure");
    }

    this.createdCount += 1;
    this.record(`handled:${context.queue}:${payload.orderId}:attempt-${context.attempt}`);
    this.logger.info(`Processed RabbitMQ order ${payload.orderId} for ${payload.customerId}`);

    await context.publish("notifications.email", {
      orderId: payload.orderId,
      template: "order-created",
      requestedAt: new Date().toISOString(),
    });
  }

  @QueueHandler("orders.completed", {
    name: "sample.rabbit.orders.completed",
    transportName: "rabbitmq",
    group: ["orders", "rabbitmq"],
  })
  onOrderCompleted(
    payload: { orderId: string; completedAt: string },
    context: QueueHandlerContext
  ) {
    this.completedCount += 1;
    this.record(`handled:${context.queue}:${payload.orderId}:${payload.completedAt}`);
    this.logger.info(`Completed RabbitMQ order ${payload.orderId}`);
  }

  @QueueHandler("notifications.email", {
    name: "sample.rabbit.notifications.email",
    transportName: "rabbitmq",
    group: "notifications",
  })
  onNotificationQueued(
    payload: { orderId: string; template: string },
    context: QueueHandlerContext
  ) {
    this.notificationCount += 1;
    this.record(`handled:${context.queue}:${payload.orderId}:${payload.template}`);
  }

  @QueueHandler("orders.dead", {
    name: "sample.rabbit.orders.dead",
    transportName: "rabbitmq",
    group: "dead-letter",
  })
  onDeadLetter(
    payload: { orderId?: string },
    context: QueueHandlerContext
  ) {
    this.deadLetterCount += 1;
    this.record(`dead-letter:${context.queue}:${payload.orderId || "unknown"}`);
  }

  @QueuePattern("orders.*", {
    name: "sample.rabbit.orders.audit",
    transportName: "rabbitmq",
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
        maxRetries: consumer.maxRetries,
        retryDelayMs: consumer.retryDelayMs,
        deadLetterQueue: consumer.deadLetterQueue,
      })),
      counters: {
        createdCount: this.createdCount,
        completedCount: this.completedCount,
        notificationCount: this.notificationCount,
        auditCount: this.auditCount,
        retryCount: this.retryCount,
        deadLetterCount: this.deadLetterCount,
      },
      events: [...this.events],
    };
  }

  private record(event: string) {
    this.events.push(`${new Date().toISOString()} ${event}`);
    if (this.events.length > 30) {
      this.events.shift();
    }
  }
}