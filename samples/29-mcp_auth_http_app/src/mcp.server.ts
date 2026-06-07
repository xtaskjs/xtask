import { Service } from "@xtaskjs/core";
import { McpResource, McpServer, McpTool } from "@xtaskjs/mcp";

@Service()
@McpServer({
  name: "xtask-auth-sample",
  version: "1.0.0",
  instructions: "Authenticated MCP sample server",
  group: ["auth", "mcp"],
})
export class AuthSampleMcpServer {
  @McpTool("whoami", {
    description: "Returns a static identity payload",
  })
  whoami() {
    return {
      service: "xtask-auth-sample",
      role: "authenticated-client",
      timestamp: new Date().toISOString(),
    };
  }

  @McpResource("resource://auth/status", {
    name: "auth-status",
    mimeType: "application/json",
  })
  authStatus() {
    return {
      authRequired: true,
      now: new Date().toISOString(),
    };
  }
}
