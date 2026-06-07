"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_1 = require("./runtime");
const express_1 = __importDefault(require("express"));
const mcp_1 = require("@xtaskjs/mcp");
const parseMode = () => {
    const fromArg = process.argv[2]?.trim().toLowerCase();
    if (fromArg === "stdio" || fromArg === "http") {
        return fromArg;
    }
    return (process.env.MCP_MODE || "http").toLowerCase() === "stdio" ? "stdio" : "http";
};
async function main() {
    const mode = parseMode();
    const runtime = await (0, runtime_1.createSampleRuntime)();
    const serverName = "xtask-sample";
    const transportHandle = mode === "stdio"
        ? await (0, mcp_1.connectMcpSdkStdio)({
            mcp: runtime.mcp,
            serverName,
        })
        : await (async () => {
            const app = (0, express_1.default)();
            app.use(express_1.default.json({ limit: "1mb" }));
            const httpHandle = await (0, mcp_1.bindMcpSdkStreamableHttp)({
                mcp: runtime.mcp,
                serverName,
                app,
                path: "/mcp",
            });
            const host = "127.0.0.1";
            const port = Number(process.env.MCP_PORT || 9000);
            const httpServer = app.listen(port, host, () => {
                console.log(`[mcp] streamable HTTP ready at http://${host}:${port}/mcp`);
            });
            return {
                async close() {
                    await httpHandle.close();
                    await new Promise((resolve, reject) => {
                        httpServer.close((error) => {
                            if (error) {
                                reject(error);
                                return;
                            }
                            resolve();
                        });
                    });
                },
            };
        })();
    const gracefulShutdown = async () => {
        await transportHandle.close();
        await runtime.app.close();
        process.exit(0);
    };
    process.on("SIGINT", () => {
        void gracefulShutdown();
    });
    process.on("SIGTERM", () => {
        void gracefulShutdown();
    });
    console.log(`[mcp] sample running in ${mode} mode`);
}
main().catch((error) => {
    console.error("Error starting MCP sample:", error);
    process.exit(1);
});
