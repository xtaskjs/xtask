import "reflect-metadata";
import { configureCache } from "@xtaskjs/cache";
import { CreateApplication } from "@xtaskjs/core";

configureCache({
  defaultDriver: "memory",
  defaultTtl: "30s",
  namespace: "samples:cache:local",
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
  console.error("Error starting the cache sample:", error);
});