"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSampleRuntime = void 0;
require("reflect-metadata");
const core_1 = require("@xtaskjs/core");
const config_1 = require("@xtaskjs/config");
const mcp_1 = require("@xtaskjs/mcp");
const zod_1 = require("zod");
require("./mcp.server");
const SampleConfigSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.string().default("development"),
    MCP_MODE: zod_1.z.enum(["stdio", "http"]).default("http"),
    MCP_PORT: zod_1.z.coerce.number().int().positive().default(9000),
    XTASK_DI_STRATEGY: zod_1.z.enum(["lazy", "eager"]).default("lazy"),
    XTASK_DI_METRICS: zod_1.z.enum(["true", "false"]).default("true"),
    XTASK_HOT_DEBOUNCE_MS: zod_1.z.coerce.number().int().nonnegative().default(60),
});
config_1.ConfigModule.register({
    schema: SampleConfigSchema,
    envFiles: [".env", ".env.local"],
});
const createSampleRuntime = async () => {
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
exports.createSampleRuntime = createSampleRuntime;
