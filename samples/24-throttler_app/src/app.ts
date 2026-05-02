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
  console.error("Error starting the throttler sample:", error);
});
