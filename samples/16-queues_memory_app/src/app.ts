import "reflect-metadata";
import { CreateApplication } from "@xtaskjs/core";
import { configureQueues, registerInMemoryQueueTransport } from "@xtaskjs/queues";

configureQueues({
  defaultTransportName: "memory",
  autoCreateDefaultInMemoryTransport: false,
});

registerInMemoryQueueTransport({
  name: "memory",
  kind: "in-memory",
});

async function main() {
  await CreateApplication({
    adapter: "node-http",
    autoListen: true,
    server: {
      host: "127.0.0.1",
      port: Number(process.env.PORT || 3000),
    },
  });
}

main().catch((error) => {
  console.error("Error starting the queues memory sample:", error);
});