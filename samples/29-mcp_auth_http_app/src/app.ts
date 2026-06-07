import { createAuthSampleRuntime } from "./runtime";
import { createAuthenticatedMcpHttpServer } from "./server";

const parseAuthMode = (): "bearer" | "oauth" => {
  const mode = String(process.env.MCP_AUTH_MODE || "bearer").toLowerCase();
  return mode === "oauth" ? "oauth" : "bearer";
};

async function main() {
  const runtime = await createAuthSampleRuntime();
  const mode = parseAuthMode();

  const server = await createAuthenticatedMcpHttpServer({
    mcp: runtime.mcp,
    mode,
    host: "127.0.0.1",
    port: Number(process.env.MCP_PORT || 9200),
    bearerToken: process.env.MCP_BEARER_TOKEN,
    oauthClientId: process.env.MCP_OAUTH_CLIENT_ID,
    oauthClientSecret: process.env.MCP_OAUTH_CLIENT_SECRET,
  });

  console.log(`[mcp] auth sample ready on ${server.url}${server.path} | mode=${mode}`);

  const shutdown = async () => {
    await server.close();
    await runtime.app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });
}

main().catch((error) => {
  console.error("Error starting MCP auth sample:", error);
  process.exit(1);
});
