import "reflect-metadata";
import { configureCache } from "@xtaskjs/cache";
import { CreateApplication } from "@xtaskjs/core";

configureCache({
  defaultDriver: "redis",
  defaultTtl: "2m",
  namespace: "samples:cache:redis",
  connectOnStart: true,
  redis: {
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  },
});

async function main() {
  await CreateApplication({
    adapter: "node-http",
    autoListen: true,
    server: {
      host: "0.0.0.0",
      port: Number(process.env.PORT || 3000),
    },
  });
}

main().catch((error) => {
  console.error("Error starting the Redis cache sample:", error);
});