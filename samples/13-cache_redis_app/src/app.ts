import "reflect-metadata";
import { configureCache } from "@xtaskjs/cache";
import { CreateApplication } from "@xtaskjs/core";
import { ConfigModule } from "@xtaskjs/config";
import { z } from "zod";

const SampleConfigSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  XTASK_DI_STRATEGY: z.enum(["lazy", "eager"]).default("lazy"),
  XTASK_DI_METRICS: z.enum(["true", "false"]).default("true"),
  XTASK_HOT_DEBOUNCE_MS: z.coerce.number().int().nonnegative().default(60),
});

ConfigModule.register({
  schema: SampleConfigSchema,
  envFiles: [".env", ".env.local"],
});

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
      host: "0.0.0.0",
      port: Number(process.env.PORT || 3000),
    },
  });
}

main().catch((error) => {
  console.error("Error starting the Redis cache sample:", error);
});