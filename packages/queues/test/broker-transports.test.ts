import "reflect-metadata";
import { describe, expect, test } from "@jest/globals";
import { createMqttTransport, createRabbitMqTransport } from "../src";

describe("broker transport helpers", () => {
  test("createRabbitMqTransport publishes and consumes through an AMQP channel", async () => {
    const consumed: any[] = [];
    const assertedQueues: string[] = [];
    const assertedQueueOptions: any[] = [];
    const hookEvents: string[] = [];
    const connectionListeners = new Map<string, (...args: any[]) => void>();
    let connectCalls = 0;
    let consumeHandler: ((message: any) => Promise<void>) | undefined;
    const channel = {
      assertExchange: async (exchange: string) => {
        consumed.push({ assertedExchange: exchange });
      },
      assertQueue: async (queue: string, options?: any) => {
        assertedQueues.push(queue);
        assertedQueueOptions.push(options);
      },
      bindQueue: async () => undefined,
      prefetch: async (value: number) => {
        consumed.push({ prefetch: value });
      },
      publish: (exchange: string, routingKey: string, payload: Buffer) => {
        consumed.push({ exchange, routingKey, payload: payload.toString("utf8") });
        return true;
      },
      consume: async (_queue: string, handler: (message: any) => Promise<void>) => {
        consumeHandler = handler;
        return { consumerTag: "consumer-1" };
      },
      cancel: async () => undefined,
      ack: (message: any) => {
        message.acked = true;
      },
      nack: (message: any, _allUpTo: boolean, requeue: boolean) => {
        message.nacked = requeue;
      },
      close: async () => undefined,
    };

    const connection = {
      on: (event: string, listener: (...args: any[]) => void) => {
        connectionListeners.set(event, listener);
      },
      createChannel: async () => channel,
      close: async () => undefined,
    };

    const transport = createRabbitMqTransport({
      transportName: "rabbitmq-primary",
      exchange: "xtask.events",
      deadLetterExchange: "xtask.dlx",
      deadLetterRoutingKey: "xtask.dead",
      qos: 7,
      reconnectDelayMs: 1,
      onConnect: () => {
        hookEvents.push("connect");
      },
      onDisconnect: (reason) => {
        hookEvents.push(`disconnect:${reason}`);
      },
      onReconnectAttempt: ({ attempt }) => {
        hookEvents.push(`reconnect-attempt:${attempt}`);
      },
      onReconnect: ({ attempt }) => {
        hookEvents.push(`reconnect:${attempt}`);
      },
      amqp: {
        connect: async () => {
          connectCalls += 1;
          return connection;
        },
      },
    });

    await transport.connect?.();
    await transport.publish("orders.created", {
      queue: "orders.created",
      transportName: "rabbitmq",
      payload: { id: "101" },
      headers: { source: "test" },
      timestamp: new Date(),
    });

    expect(consumed).toEqual([
      {
        assertedExchange: "xtask.events",
      },
      {
        assertedExchange: "xtask.dlx",
      },
      {
        prefetch: 7,
      },
      {
        exchange: "xtask.events",
        routingKey: "orders.created",
        payload: JSON.stringify({ id: "101" }),
      },
    ]);

    const subscription = await transport.subscribe({
      consumerName: "orders.consumer",
      pattern: "orders.*",
      consumerPolicy: "competing",
      consumerGroup: "workers",
      handler: async (message) => {
        consumed.push({ handled: message.queue, payload: message.payload });
        await message.ack?.();
      },
    });

    expect(assertedQueues).toContain("workers");
    expect(assertedQueueOptions[0]?.arguments).toEqual({
      "x-dead-letter-exchange": "xtask.dlx",
      "x-dead-letter-routing-key": "xtask.dead",
    });

    const rawMessage: any = {
      fields: { routingKey: "orders.created" },
      properties: { headers: { source: "broker" }, timestamp: Date.now() },
      content: Buffer.from(JSON.stringify({ id: "202" })),
    };

    await consumeHandler?.(rawMessage);
    expect(consumed).toContainEqual({ handled: "orders.created", payload: { id: "202" } });
    expect(rawMessage.acked).toBe(true);

    connectionListeners.get("close")?.();
    await transport.publish("orders.created", {
      queue: "orders.created",
      transportName: "rabbitmq",
      payload: { id: "303" },
      headers: {},
      timestamp: new Date(),
    });

    expect(connectCalls).toBe(2);
    expect(hookEvents).toContain("connect");
    expect(hookEvents).toContain("disconnect:close");
    expect(hookEvents).toContain("reconnect-attempt:1");
    expect(hookEvents).toContain("reconnect:1");

    await subscription.stop?.();
    await transport.disconnect?.();
  });

  test("createMqttTransport publishes exact topics and locally filters regex subscriptions", async () => {
    const published: Array<{ topic: string; payload: string }> = [];
    const subscribedTopics: Array<{ topic: string; options: any }> = [];
    const hookEvents: string[] = [];
    const listeners = new Map<string, Set<(...args: any[]) => void>>();

    const client = {
      connected: true,
      publish: (topic: string, payload: string | Buffer, _options: any, callback: (error?: any) => void) => {
        published.push({
          topic,
          payload: Buffer.from(payload).toString("utf8"),
          options: _options,
        } as any);
        callback();
      },
      subscribe: (topic: string, _options: any, callback: (error?: any) => void) => {
        subscribedTopics.push({ topic, options: _options });
        callback();
      },
      unsubscribe: (_topic: string, callback: (error?: any) => void) => callback(),
      on: (event: string, listener: (...args: any[]) => void) => {
        const handlers = listeners.get(event) || new Set();
        handlers.add(listener);
        listeners.set(event, handlers);
      },
      off: (event: string, listener: (...args: any[]) => void) => {
        listeners.get(event)?.delete(listener);
      },
      end: (_force: boolean, _options: any, callback: () => void) => callback(),
    };

    const handled: any[] = [];
    const transport = createMqttTransport({
      transportName: "mqtt-primary",
      client,
      topicPrefix: "xtask",
      patternSubscriptionTopic: "orders/#",
      qos: 1,
      subscribeQos: 2,
      retain: true,
      onConnect: () => {
        hookEvents.push("connect");
      },
      onReconnectAttempt: () => {
        hookEvents.push("reconnect-attempt");
      },
      onReconnect: () => {
        hookEvents.push("reconnect");
      },
      onDisconnect: (reason) => {
        hookEvents.push(`disconnect:${reason}`);
      },
    });

    await transport.publish("orders/created", {
      queue: "orders/created",
      transportName: "mqtt",
      payload: { id: "301" },
      headers: {},
      timestamp: new Date(),
    });

    Array.from(listeners.get("connect") || []).forEach((listener) => listener());

    expect(published).toEqual([
      {
        topic: "xtask/orders/created",
        payload: JSON.stringify({ id: "301" }),
        options: expect.objectContaining({
          qos: 1,
          retain: true,
        }),
      },
    ]);

    const subscription = await transport.subscribe({
      consumerName: "orders.regex",
      pattern: /^orders\/.*$/,
      consumerPolicy: "competing",
      consumerGroup: "workers",
      handler: async (message) => {
        handled.push({ queue: message.queue, payload: message.payload });
      },
    });

    expect(subscribedTopics).toEqual([
      {
        topic: "$share/workers/xtask/orders/#",
        options: expect.objectContaining({
          qos: 2,
        }),
      },
    ]);

    const messageHandlers = Array.from(listeners.get("message") || []);
    await Promise.all(
      messageHandlers.map((handler) =>
        Promise.resolve(
          handler("xtask/orders/created", Buffer.from(JSON.stringify({ id: "302" })), {
            properties: { userProperties: { source: "mqtt" } },
          })
        )
      )
    );
    await Promise.all(
      messageHandlers.map((handler) =>
        Promise.resolve(
          handler("xtask/payments/created", Buffer.from(JSON.stringify({ id: "999" })), {
            properties: { userProperties: { source: "mqtt" } },
          })
        )
      )
    );

    expect(handled).toEqual([{ queue: "orders/created", payload: { id: "302" } }]);

    Array.from(listeners.get("reconnect") || []).forEach((listener) => listener());
    Array.from(listeners.get("close") || []).forEach((listener) => listener());
    expect(hookEvents).toContain("connect");
    expect(hookEvents).toContain("reconnect-attempt");
    expect(hookEvents).toContain("reconnect");
    expect(hookEvents).toContain("disconnect:close");

    await subscription.stop?.();
    await transport.disconnect?.();
  });
});