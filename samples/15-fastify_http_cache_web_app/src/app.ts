import "reflect-metadata";
import fastify from "fastify";
import { configureCache } from "@xtaskjs/cache";
import { CreateApplication } from "@xtaskjs/core";
import { FastifyAdapter } from "@xtaskjs/fastify-http";

configureCache({
  httpCacheDefaults: {
    visibility: "public",
    maxAge: "2m",
    etag: true,
    vary: ["accept-language"],
  },
});

async function main() {
  const fastifyApp = fastify({ logger: true });

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
    adapter: new FastifyAdapter(fastifyApp),
    autoListen: true,
    server: {
      host: "127.0.0.1",
      port: Number(process.env.PORT || 3000),
    },
  });
}

main().catch((error) => {
  console.error("Error starting the Fastify HTTP cache web sample:", error);
});