import "reflect-metadata";
import { CreateApplication } from "@xtaskjs/core";
import { configureQueues, createRabbitMqTransport, registerQueueTransport } from "@xtaskjs/queues";

const amqpUrl = process.env.AMQP_URL || "amqp://guest:guest@127.0.0.1:5672";
const exchange = process.env.AMQP_EXCHANGE || "xtask.samples.orders";
const deadLetterExchange = process.env.AMQP_DLX || `${exchange}.dlx`;

configureQueues({
  defaultTransportName: "rabbitmq",
  autoCreateDefaultInMemoryTransport: false,
});

registerQueueTransport({
  name: "rabbitmq",
  kind: "rabbitmq",
  transport: createRabbitMqTransport({
    transportName: "rabbitmq",
    url: amqpUrl,
    exchange,
    exchangeType: "topic",
    qos: 5,
    reconnectDelayMs: 2000,
    deadLetterExchange,
    deadLetterRoutingKey: (definition) => {
      if (definition.queue) {
        return `${definition.queue}.broker-dead`;
      }

      if (typeof definition.pattern === "string") {
        return `${definition.pattern}.broker-dead`;
      }

      return "xtask.samples.orders.broker-dead";
    },
    onReconnectAttempt: ({ attempt }) => {
      console.warn(`[RabbitMQ] reconnect attempt ${attempt ?? 0}`);
    },
    onReconnect: () => {
      console.warn("[RabbitMQ] reconnected");
    },
    onError: (error) => {
      console.error("[RabbitMQ] transport error", error.message);
    },
  }),
});

async function main() {
  await CreateApplication({
    container: {
      resolutionStrategy: process.env.XTASK_DI_STRATEGY === "eager" ? "eager" : "lazy",
      metricsEnabled: process.env.XTASK_DI_METRICS !== "false",
    },
    hotManifestWatcher: {
      enabled: process.env.NODE_ENV === "development",
      debounceMs: Number(process.env.XTASK_HOT_DEBOUNCE_MS || 60),
    },
    prebuiltManifest: {
      enabled: process.env.NODE_ENV === "production",
    },
    adapter: "node-http",
    autoListen: true,
    server: {
      host: "127.0.0.1",
      port: Number(process.env.PORT || 3000),
    },
  });
}

main().catch((error) => {
  console.error("Error starting the queues RabbitMQ sample:", error);
});