import "reflect-metadata";
import { CreateApplication, type XTaskHttpApplication } from "@xtaskjs/core";
import { ConfigModule } from "@xtaskjs/config";
import {
  McpService,
  getMcpServiceToken,
  initializeMcpIntegration,
} from "@xtaskjs/mcp";
import { z } from "zod";
import "./mcp.server";

export type AuthMode = "bearer" | "oauth";

const SampleConfigSchema = z.object({
  NODE_ENV: z.string().default("development"),
  MCP_PORT: z.coerce.number().int().positive().default(9200),
  MCP_AUTH_MODE: z.enum(["bearer", "oauth"]).default("bearer"),
  MCP_BEARER_TOKEN: z.string().min(1).default("xtask-dev-token"),
  MCP_OAUTH_CLIENT_ID: z.string().min(1).default("xtask-client"),
  MCP_OAUTH_CLIENT_SECRET: z.string().min(1).default("xtask-secret"),
  XTASK_DI_STRATEGY: z.enum(["lazy", "eager"]).default("lazy"),
  XTASK_DI_METRICS: z.enum(["true", "false"]).default("true"),
  XTASK_HOT_DEBOUNCE_MS: z.coerce.number().int().nonnegative().default(60),
});

ConfigModule.register({
  schema: SampleConfigSchema,
  envFiles: [".env", ".env.local"],
});

export interface AuthSampleRuntime {
  app: XTaskHttpApplication;
  mcp: McpService;
}

export const createAuthSampleRuntime = async (): Promise<AuthSampleRuntime> => {
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
    adapter: "node-http",
    autoListen: false,
  });

  const container = await app.getKernel().getContainer();
  let mcp: McpService;

  try {
    mcp = container.getByName<McpService>(getMcpServiceToken());
  } catch {
    await initializeMcpIntegration(container, app.getLifecycle());
    mcp = container.getByName<McpService>(getMcpServiceToken());
  }

  return {
    app,
    mcp,
  };
};
