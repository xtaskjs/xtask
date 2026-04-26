import "reflect-metadata";
import { configureThrottler } from "@xtaskjs/throttler";
import { CreateApplication } from "@xtaskjs/core";

// Global default: 5 requests per 10 seconds, identified by IP.
// Individual routes below override this as needed.
configureThrottler({
  limit: 5,
  ttl: "10s",
  driver: "memory",
  errorMessage: "Rate limit exceeded. Please slow down.",
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
  console.error("Error starting the throttler sample:", error);
});
