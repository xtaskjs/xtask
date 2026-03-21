# @xtaskjs/queues

Queue integration package for xtaskjs.

This package is part of the xtaskjs project, hosted at [xtaskjs.io](https://xtaskjs.io).

## Installation
```bash
npm install @xtaskjs/queues reflect-metadata
```

Optional broker helpers:

```bash
npm install amqplib
npm install mqtt
```

## What It Provides
- A transport-agnostic queue API that can back RabbitMQ, MQTT, Redis streams, SQS, or custom brokers.
- Method decorators for queue consumers and topic-style pattern listeners.
- A publish decorator and an injectable queue service for producers.
- Delayed retries, dead-letter routing, and competing-consumer policies for production-style delivery flows.
- Lifecycle integration so handlers start on `ready` and stop on `app.close()`.
- DI tokens and decorators for injecting the queue service, lifecycle manager, or named transport implementations.
- A built-in in-memory transport so the package works immediately in tests and local development.

## Register A Transport
```typescript
import { registerQueueTransport } from "@xtaskjs/queues";

registerQueueTransport({
  name: "rabbitmq",
  kind: "rabbitmq",
  async transport() {
    return {
      async connect() {
        // open broker connection
      },
      async disconnect() {
        // close broker connection
      },
      async publish(queue, message) {
        console.log("publish", queue, message.payload);
      },
      async subscribe(definition) {
        return {
          async stop() {
            console.log("stop consumer", definition.consumerName);
          },
        };
      },
    };
  },
});
```

If you do not register a transport, xtaskjs creates a default in-memory transport automatically.

## RabbitMQ Helper
```typescript
import { createRabbitMqTransport, registerQueueTransport } from "@xtaskjs/queues";

registerQueueTransport({
  name: "rabbitmq",
  kind: "rabbitmq",
  transport: createRabbitMqTransport({
    url: process.env.AMQP_URL,
    exchange: "xtask.events",
    exchangeType: "topic",
    qos: 10,
    deadLetterExchange: "xtask.events.dlx",
    deadLetterRoutingKey: "xtask.dead",
    reconnectDelayMs: 2000,
    onReconnectAttempt: ({ attempt }) => {
      console.log("rabbit reconnect attempt", attempt);
    },
  }),
});
```

Notes:
- When `exchange` is configured, `publish("orders.created", payload)` uses the queue name as the routing key.
- `deadLetterExchange` and `deadLetterRoutingKey` are applied to asserted queues with RabbitMQ dead-letter arguments.
- `qos` is a convenience alias for channel prefetch.
- `QueuePattern("orders.*")` maps directly to RabbitMQ topic bindings.
- For `RegExp` or function patterns, the helper binds with `patternSubscriptionKey` or `#` and applies the final filter locally.
- For competing pattern consumers, set `consumerPolicy: "competing"` and a stable `consumerGroup` so they share the same RabbitMQ queue.
- Reconnect hooks are available through `onConnect`, `onDisconnect`, `onReconnectAttempt`, `onReconnect`, and `onError`.

## MQTT Helper
```typescript
import { createMqttTransport, registerQueueTransport } from "@xtaskjs/queues";

registerQueueTransport({
  name: "mqtt",
  kind: "mqtt",
  transport: createMqttTransport({
    brokerUrl: process.env.MQTT_URL,
    topicPrefix: "xtask",
    qos: 1,
    subscribeQos: 1,
    retain: true,
    reconnectPeriod: 2000,
    onReconnect: () => {
      console.log("mqtt reconnected");
    },
  }),
});
```

Notes:
- Queue names map to MQTT topics.
- `qos`, `subscribeQos`, and `retain` provide convenience defaults for broker-level delivery behavior.
- `QueuePattern("orders/+")` and `QueuePattern("orders/#")` map directly to MQTT topic filters.
- `RegExp` or function patterns subscribe through `patternSubscriptionTopic` or `#` and then filter locally.
- Competing consumers use MQTT shared subscriptions via `$share/{group}/topic` when `consumerPolicy: "competing"` is enabled.
- Reconnect hooks are available through `onConnect`, `onDisconnect`, `onReconnectAttempt`, `onReconnect`, and `onError`.

## Declare Queue Handlers
```typescript
import { Service } from "@xtaskjs/core";
import { QueueHandler, QueuePattern } from "@xtaskjs/queues";

@Service()
class BillingConsumers {
  @QueueHandler("billing.invoice.created", {
    name: "billing.invoice.created.handler",
    group: ["billing", "invoices"],
    maxRetries: 3,
    retryDelay: "5s",
    retryStrategy: "exponential",
    deadLetterQueue: "billing.invoice.created.dlq",
    consumerPolicy: "competing",
    consumerGroup: "billing-workers",
  })
  async onInvoiceCreated(payload: { invoiceId: string }, context: { attempt: number }) {
    console.log("invoice created", payload.invoiceId, context.attempt);
  }

  @QueuePattern("billing.*", {
    name: "billing.topic.listener",
    transportName: "rabbitmq",
  })
  async onBillingTopic(payload: any, context: { queue: string }) {
    console.log("topic", context.queue, payload);
  }
}
```

Handler methods receive `(payload, context)`.

The `context` exposes:
- `queue`: the queue or topic name that delivered the message.
- `transportName`: the named transport used for the subscription.
- `attempt` and `maxRetries`: current retry attempt and configured retry limit.
- `deadLetterQueue`: target queue used after retries are exhausted, when configured.
- `ack()` and `nack(requeue?)`: explicit acknowledgement controls when the transport supports them.
- `publish(queue, payload, options)`: publish follow-up messages from the same transport.

## Production Semantics
- `maxRetries`: number of delayed retry republishes before the message is considered exhausted.
- `retryDelay`: base retry delay. Accepts numbers or strings like `500ms`, `5s`, `1m`.
- `retryStrategy`: `fixed` or `exponential` backoff.
- `deadLetterQueue`: queue that receives the final failed payload after retries are exhausted.
- `deadLetterTransportName`: optional transport override for the dead-letter publish.
- `consumerPolicy`: `broadcast` or `competing`.
- `consumerGroup`: stable group name used by transports to coordinate competing consumers.

When xtaskjs retries a message, it republishes the payload with retry metadata in headers. When retries are exhausted and `deadLetterQueue` is configured, xtaskjs republishes the original payload to the dead-letter queue with failure metadata.

## Inject The Queue Service
```typescript
import { Service } from "@xtaskjs/core";
import { InjectQueueService, QueueService } from "@xtaskjs/queues";

@Service()
class InvoicePublisher {
  constructor(
    @InjectQueueService()
    private readonly queues: QueueService
  ) {}

  async publishInvoice(invoiceId: string) {
    await this.queues.publish("billing.invoice.created", { invoiceId });
  }

  producer() {
    return this.queues.createProducer({
      queue: "billing.invoice.created",
      transportName: "rabbitmq",
    });
  }
}
```

## Publish Decorator
```typescript
import { Service } from "@xtaskjs/core";
import { PublishToQueue } from "@xtaskjs/queues";

@Service()
class CheckoutService {
  @PublishToQueue("checkout.completed")
  completeOrder(orderId: string) {
    return { orderId, status: "completed" };
  }
}
```

The method result is published after the method resolves. The original return value is preserved.

## Transport Contract
Custom transports implement a small surface:

```typescript
interface QueueTransport {
  connect?(): Promise<void> | void;
  disconnect?(): Promise<void> | void;
  publish(queue: string, message: QueueTransportMessage): Promise<any>;
  subscribe(definition: QueueSubscriptionDefinition): Promise<QueueSubscriptionHandle> | QueueSubscriptionHandle;
}
```

This keeps the package neutral about broker semantics while giving xtaskjs a common producer and consumer model.

## Runtime Management
`QueueService` supports:
- `publish(queue, payload, options)`
- `createProducer(defaults)`
- `listConsumers(group?)`
- `listGroups()`
- `listTransportNames()` and `listTransports()`
- `startAll()`, `stopAll()`, `startGroup(group)`, `stopGroup(group)`
- `startConsumer(name)`, `stopConsumer(name)`

## Lifecycle Behavior
- During `CreateApplication()`: registered transports are initialized and decorated consumers are discovered from the DI container.
- On lifecycle `ready`: queue consumers start automatically unless disabled or configured with `autoStart: false`.
- During `app.close()`: active consumers are stopped and transports are disconnected before the container is destroyed.

## Resources
- Project site and documentation: [xtaskjs.io](https://xtaskjs.io)
- npm package: [@xtaskjs/queues](https://www.npmjs.com/package/@xtaskjs/queues)
- Source repository: [xtaskjs/xtaskjs](https://github.com/xtaskjs/xtaskjs)