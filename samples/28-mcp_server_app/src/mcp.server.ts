import { Service } from "@xtaskjs/core";
import {
  McpPrompt,
  McpResource,
  McpServer,
  McpTool,
  OnMcpServerStart,
  OnMcpServerStop,
} from "@xtaskjs/mcp";

@Service()
@McpServer({
  name: "xtask-sample",
  version: "1.0.0",
  instructions: "Demo MCP server built from @xtaskjs/mcp decorators",
  group: ["demo", "mcp"],
})
export class SampleMcpServer {
  private readonly startedAt = new Date().toISOString();

  @OnMcpServerStart()
  onStart() {
    console.log("[mcp] xtask-sample started");
  }

  @OnMcpServerStop()
  onStop() {
    console.log("[mcp] xtask-sample stopped");
  }

  @McpTool("echo", {
    description: "Echo back any payload as structured JSON",
  })
  echo(payload: unknown) {
    return {
      ok: true,
      payload,
      handledAt: new Date().toISOString(),
    };
  }

  @McpTool("sum", {
    description: "Calculate the sum of numeric values",
  })
  sum(input?: { values?: number[] }) {
    const values = Array.isArray(input?.values)
      ? input!.values.filter((value) => typeof value === "number" && Number.isFinite(value))
      : [];

    const total = values.reduce((acc, current) => acc + current, 0);
    return {
      total,
      count: values.length,
    };
  }

  @McpPrompt("status", {
    description: "Return a reusable prompt with runtime status context",
  })
  statusPrompt(input?: { audience?: string }) {
    const audience = input?.audience || "operator";
    return `Prepare a short operational status update for ${audience}.`;
  }

  @McpResource("resource://xtask/status", {
    name: "runtime-status",
    description: "Current runtime status snapshot",
    mimeType: "application/json",
  })
  runtimeStatus() {
    return {
      service: "xtask-sample",
      startedAt: this.startedAt,
      now: new Date().toISOString(),
      healthy: true,
    };
  }
}
