import "reflect-metadata";
import express from "express";
import { CreateApplication } from "@xtaskjs/core";
import { ExpressAdapter } from "@xtaskjs/express-http";
import { BotsModule, SlackAdapter, TelegramAdapter } from "@xtaskjs/bots";
import { registerJwtStrategy, SecurityValidationContext } from "@xtaskjs/security";
import { SAMPLE_JWT_SECRET, SAMPLE_TENANT } from "./security.config";
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

const validateJwtClaims = async (
  payload: Record<string, any>,
  _context: SecurityValidationContext
) => {
  if (payload.tenant !== SAMPLE_TENANT) {
    return false;
  }

  return {
    sub: String(payload.sub || "webhook-user"),
    roles: Array.isArray(payload.roles) ? payload.roles : ["bot:webhook:reader"],
    claims: payload,
  };
};

registerJwtStrategy({
  name: "default",
  default: true,
  secretOrKey: SAMPLE_JWT_SECRET,
  validate: validateJwtClaims,
});

async function main() {
  const expressApp = express();
  expressApp.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString("utf-8");
      },
    })
  );

  const app = await CreateApplication({
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
    adapter: new ExpressAdapter(expressApp),
    autoListen: false,
  });

  const container = await app.getKernel().getContainer();

  await BotsModule.register({
    adapters: [
      new SlackAdapter({
        sender: async (message) => {
          console.log("[slack] outbound", message);
        },
      }),
      new TelegramAdapter({
        sender: async (message) => {
          console.log("[telegram] outbound", message);
        },
      }),
    ],
  });

  await BotsModule.initialize(container, app.getLifecycle());
  await BotsModule.service().startAll();

  await app.listen({
    host: "127.0.0.1",
    port: Number(process.env.PORT || 3000),
  });
}

main().catch((error) => {
  console.error("Error starting bots webhook security sample:", error);
});
