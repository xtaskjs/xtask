import { createSampleRuntime } from "./runtime";
import express from "express";
import {
  bindMcpSdkStreamableHttp,
  connectMcpSdkStdio,
} from "@xtaskjs/mcp";

const parseMode = (): "stdio" | "http" => {
  const fromArg = process.argv[2]?.trim().toLowerCase();
  if (fromArg === "stdio" || fromArg === "http") {
    return fromArg;
  }

  return (process.env.MCP_MODE || "http").toLowerCase() === "stdio" ? "stdio" : "http";
};

async function main() {
  const mode = parseMode();
  const runtime = await createSampleRuntime();
  const serverName = "xtask-sample";

  const transportHandle =
    mode === "stdio"
      ? await connectMcpSdkStdio({
          mcp: runtime.mcp,
          serverName,
        })
      : await (async () => {
          const app = express();
          app.use(express.json({ limit: "1mb" }));

          const httpHandle = await bindMcpSdkStreamableHttp({
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
              await new Promise<void>((resolve, reject) => {
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
