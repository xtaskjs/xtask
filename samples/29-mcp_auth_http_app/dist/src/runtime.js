"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthSampleRuntime = void 0;
require("reflect-metadata");
const core_1 = require("@xtaskjs/core");
const config_1 = require("@xtaskjs/config");
const mcp_1 = require("@xtaskjs/mcp");
const zod_1 = require("zod");
require("./mcp.server");
const SampleConfigSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.string().default("development"),
    MCP_PORT: zod_1.z.coerce.number().int().positive().default(9200),
    MCP_AUTH_MODE: zod_1.z.enum(["bearer", "oauth"]).default("bearer"),
    MCP_BEARER_TOKEN: zod_1.z.string().min(1).default("xtask-dev-token"),
    MCP_OAUTH_CLIENT_ID: zod_1.z.string().min(1).default("xtask-client"),
    MCP_OAUTH_CLIENT_SECRET: zod_1.z.string().min(1).default("xtask-secret"),
    XTASK_DI_STRATEGY: zod_1.z.enum(["lazy", "eager"]).default("lazy"),
    XTASK_DI_METRICS: zod_1.z.enum(["true", "false"]).default("true"),
    XTASK_HOT_DEBOUNCE_MS: zod_1.z.coerce.number().int().nonnegative().default(60),
});
config_1.ConfigModule.register({
    schema: SampleConfigSchema,
    envFiles: [".env", ".env.local"],
});
const createAuthSampleRuntime = async () => {
    const app = await (0, core_1.CreateApplication)({
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
    let mcp;
    try {
        mcp = container.getByName((0, mcp_1.getMcpServiceToken)());
    }
    catch {
        await (0, mcp_1.initializeMcpIntegration)(container, app.getLifecycle());
        mcp = container.getByName((0, mcp_1.getMcpServiceToken)());
    }
    return {
        app,
        mcp,
    };
};
exports.createAuthSampleRuntime = createAuthSampleRuntime;
