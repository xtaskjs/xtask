import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { ApplicationLifeCycle, Container, Service } from "@xtaskjs/core";
import {
  getQueueServiceToken,
  getQueueTransportToken,
  initializeQueueIntegration,
  InjectQueueService,
  InjectQueueTransport,
  PublishToQueue,
  QueueHandler,
  QueuePattern,
  QueueService,
  resetQueueIntegration,
} from "../src";

const flushQueue = async (cycles = 4): Promise<void> => {
  for (let index = 0; index < cycles; index += 1) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }
};

@Service()
class OrdersConsumer {
  public received: string[] = [];

  @QueueHandler("orders.created", {
    name: "orders.consumer",
    group: "orders",
  })
  async onOrderCreated(payload: { id: string }, context: { queue: string }) {
    this.received.push(`${context.queue}:${payload.id}`);
  }
}

@Service()
class OrdersPublisher {
  constructor(
    @InjectQueueService()
    public readonly queues: QueueService,
    @InjectQueueTransport()
    public readonly transport: any
  ) {}

  async publish(id: string): Promise<void> {
    await this.queues.publish("orders.created", { id });
  }
}

@Service()
class TopicConsumer {
  public retries = 0;
  public events: string[] = [];

  @QueuePattern("orders.*", {
    name: "orders.topic",
    group: ["orders", "topics"],
  })
  onOrdersTopic(payload: { id: string }, context: { queue: string }) {
    this.events.push(`${context.queue}:${payload.id}`);
  }

  @QueueHandler("retry.queue", {
    name: "retry.consumer",
    requeueOnError: true,
  })
  async retryOnce(payload: { id: string }) {
    this.retries += 1;
    if (this.retries < 2) {
      throw new Error(`retry:${payload.id}`);
    }

    this.events.push(`retry:${payload.id}`);
  }
}

@Service()
class RetryAndDeadLetterConsumer {
  public attempts = 0;

  @QueueHandler("jobs.retry", {
    name: "jobs.retry.consumer",
    maxRetries: 2,
    retryDelay: "2ms",
    deadLetterQueue: "jobs.retry.dlq",
  })
  async alwaysFail(payload: { id: string }, context: { attempt: number }) {
    this.attempts += 1;
    throw new Error(`failed:${payload.id}:attempt:${context.attempt}`);
  }
}

@Service()
class DeadLetterConsumer {
  public deadLetters: Array<{ id: string; attempts: number; source: string }> = [];

  @QueueHandler("jobs.retry.dlq", {
    name: "jobs.retry.dlq.consumer",
  })
  onDeadLetter(
    payload: { id: string },
    context: { message: { headers: Record<string, any> } }
  ) {
    this.deadLetters.push({
      id: payload.id,
      attempts: Number(context.message.headers["x-xtask-retry-attempt"] || 0),
      source: String(context.message.headers["x-xtask-dead-letter-source"] || ""),
    });
  }
}

@Service()
class CompetingConsumerA {
  public handled: string[] = [];

  @QueueHandler("jobs.shared", {
    name: "jobs.shared.a",
    consumerPolicy: "competing",
    consumerGroup: "workers",
  })
  onJob(payload: { id: string }) {
    this.handled.push(payload.id);
  }
}

@Service()
class CompetingConsumerB {
  public handled: string[] = [];

  @QueueHandler("jobs.shared", {
    name: "jobs.shared.b",
    consumerPolicy: "competing",
    consumerGroup: "workers",
  })
  onJob(payload: { id: string }) {
    this.handled.push(payload.id);
  }
}

@Service()
class DecoratedPublisher {
  @PublishToQueue("orders.completed")
  complete(id: string) {
    return { id };
  }
}

@Service()
class CompletedConsumer {
  public completed: string[] = [];

  @QueueHandler("orders.completed", {
    name: "orders.completed.consumer",
    group: "orders",
  })
  onCompleted(payload: { id: string }) {
    this.completed.push(payload.id);
  }
}

describe("@xtaskjs/queues integration", () => {
  beforeEach(async () => {
    await resetQueueIntegration();
  });

  afterEach(async () => {
    await resetQueueIntegration();
  });

  test("starts discovered consumers on lifecycle ready and injects queue services", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();
    container.register(OrdersConsumer, { scope: "singleton" });
    container.register(OrdersPublisher, { scope: "singleton" });

    await initializeQueueIntegration(container, lifecycle);

    const publisher = container.get(OrdersPublisher);
    const consumer = container.get(OrdersConsumer);
    const queues = container.getByName<QueueService>(getQueueServiceToken());
    const transport = container.getByName<any>(getQueueTransportToken());

    expect(typeof publisher.transport.publish).toBe("function");
    expect(typeof transport.publish).toBe("function");
    expect(queues.listConsumers().map((item) => item.name)).toEqual(["orders.consumer"]);
    expect(queues.listGroups()).toEqual(["orders"]);

    await publisher.publish("before-ready");
    await flushQueue();
    expect(consumer.received).toEqual([]);

    await lifecycle.emit("ready");
    await publisher.publish("after-ready");
    await flushQueue();

    expect(consumer.received).toEqual(["orders.created:after-ready"]);
    expect(queues.isStarted()).toBe(true);

    await queues.stopGroup("orders");
    await publisher.publish("stopped");
    await flushQueue();
    expect(consumer.received).toEqual(["orders.created:after-ready"]);

    await queues.startGroup("orders");
    await publisher.publish("started-again");
    await flushQueue();
    expect(consumer.received).toEqual([
      "orders.created:after-ready",
      "orders.created:started-again",
    ]);
  });

  test("supports pattern listeners, requeue-on-error, and publish decorators", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();
    container.register(TopicConsumer, { scope: "singleton" });
    container.register(DecoratedPublisher, { scope: "singleton" });
    container.register(CompletedConsumer, { scope: "singleton" });

    await initializeQueueIntegration(container, lifecycle);
    await lifecycle.emit("ready");

    const queues = container.getByName<QueueService>(getQueueServiceToken());
    const topicConsumer = container.get(TopicConsumer);
    const completedConsumer = container.get(CompletedConsumer);
    const decoratedPublisher = container.get(DecoratedPublisher);

    await queues.publish("orders.created", { id: "101" });
    await queues.publish("retry.queue", { id: "retry-1" });
    decoratedPublisher.complete("completed-1");
    await flushQueue(6);

    expect(topicConsumer.events).toContain("orders.created:101");
    expect(topicConsumer.events).toContain("retry:retry-1");
    expect(topicConsumer.retries).toBe(2);
    expect(completedConsumer.completed).toEqual(["completed-1"]);

    const producer = queues.createProducer({ queue: "orders.created" });
    await producer.publish({ id: "202" });
    await flushQueue();

    expect(topicConsumer.events).toContain("orders.created:202");
    expect(queues.listTransportNames()).toEqual(["default"]);
  });

  test("supports delayed retries, dead-letter routing, and competing consumers", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();
    container.register(RetryAndDeadLetterConsumer, { scope: "singleton" });
    container.register(DeadLetterConsumer, { scope: "singleton" });
    container.register(CompetingConsumerA, { scope: "singleton" });
    container.register(CompetingConsumerB, { scope: "singleton" });

    await initializeQueueIntegration(container, lifecycle);
    await lifecycle.emit("ready");

    const queues = container.getByName<QueueService>(getQueueServiceToken());
    const retryingConsumer = container.get(RetryAndDeadLetterConsumer);
    const deadLetterConsumer = container.get(DeadLetterConsumer);
    const consumerA = container.get(CompetingConsumerA);
    const consumerB = container.get(CompetingConsumerB);

    await queues.publish("jobs.retry", { id: "job-1" });
    await queues.publish("jobs.shared", { id: "job-a" });
    await queues.publish("jobs.shared", { id: "job-b" });
    await queues.publish("jobs.shared", { id: "job-c" });
    await flushQueue(18);

    expect(retryingConsumer.attempts).toBe(3);
    expect(deadLetterConsumer.deadLetters).toEqual([
      {
        id: "job-1",
        attempts: 2,
        source: "jobs.retry",
      },
    ]);

    const handledJobs = [...consumerA.handled, ...consumerB.handled].sort();
    expect(handledJobs).toEqual(["job-a", "job-b", "job-c"]);
    expect(consumerA.handled.length).toBeGreaterThan(0);
    expect(consumerB.handled.length).toBeGreaterThan(0);

    const competingSummary = queues
      .listConsumers()
      .filter((consumer) => consumer.name.startsWith("jobs.shared"));
    expect(competingSummary.every((consumer) => consumer.consumerPolicy === "competing")).toBe(true);
  });
});