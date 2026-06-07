# @xtaskjs/mcp

MCP server builder integration for xtaskjs.

This package lets you declare MCP servers with decorators, then wires discovery and lifecycle start/stop into the xtaskjs application lifecycle.

## Installation

```bash
npm install @xtaskjs/mcp reflect-metadata
```

## What It Provides

- `@McpServer` class decorator to define MCP server metadata.
- `@McpTool`, `@McpPrompt`, and `@McpResource` method decorators.
- `@OnMcpServerStart` and `@OnMcpServerStop` lifecycle hooks.
- `McpService` for listing servers/methods and invoking tool/prompt/resource handlers.
- Automatic lifecycle integration: starts on `ready`, stops on `stopping` / `app.close()`.

## Quick Example

```typescript
import { Service } from "@xtaskjs/core";
import {
  McpServer,
  McpTool,
  McpPrompt,
  McpResource,
  OnMcpServerStart,
  OnMcpServerStop,
} from "@xtaskjs/mcp";

@Service()
@McpServer({
  name: "dev-tools",
  instructions: "Internal MCP server",
  group: "internal",
})
class DevToolsMcpServer {
  @OnMcpServerStart()
  onStart() {
    console.log("MCP server started");
  }

  @McpTool("echo")
  echo(payload: unknown) {
    return { payload };
  }

  @McpPrompt("welcome")
  welcome(input?: { name?: string }) {
    return `hello ${input?.name || "world"}`;
  }

  @McpResource("config://runtime", { mimeType: "application/json" })
  runtimeConfig() {
    return { feature: "mcp", enabled: true };
  }

  @OnMcpServerStop()
  onStop() {
    console.log("MCP server stopped");
  }
}
```

## Injecting the Service

```typescript
import { Service } from "@xtaskjs/core";
import { InjectMcpService, McpService } from "@xtaskjs/mcp";

@Service()
class McpController {
  constructor(@InjectMcpService() private readonly mcp: McpService) {}

  async runEcho() {
    return this.mcp.executeTool("dev-tools", "echo", { message: "hi" });
  }
}
```

## Official SDK Adapter (`@modelcontextprotocol/sdk`)

When you want to expose your `@xtaskjs/mcp` decorated server through the official MCP SDK transports, use:

- `createMcpSdkServerAdapter(...)`
- `connectMcpSdkStdio(...)`
- `bindMcpSdkStreamableHttp(...)`

Install peer dependencies:

```bash
npm install @modelcontextprotocol/sdk zod
```

### stdio

```typescript
import { connectMcpSdkStdio } from "@xtaskjs/mcp";

const handle = await connectMcpSdkStdio({
  mcp: mcpService,
  serverName: "dev-tools",
});

process.on("SIGINT", async () => {
  await handle.close();
  process.exit(0);
});
```

### Streamable HTTP (Express)

```typescript
import express from "express";
import { bindMcpSdkStreamableHttp } from "@xtaskjs/mcp";

const app = express();
app.use(express.json());

const httpHandle = await bindMcpSdkStreamableHttp({
  mcp: mcpService,
  serverName: "dev-tools",
  app,
  path: "/mcp",
});

app.listen(9000);

process.on("SIGINT", async () => {
  await httpHandle.close();
  process.exit(0);
});
```

## Decorators

- `@McpServer(options)`
- `@McpTool(name, options)`
- `@McpPrompt(name, options)`
- `@McpResource(uriTemplate, options)`
- `@OnMcpServerStart(options)`
- `@OnMcpServerStop(options)`
- `@InjectMcpService()`
- `@InjectMcpLifecycleManager()`

## Lifecycle Behavior

- During `CreateApplication()`: MCP servers are discovered from registered services.
- On lifecycle `ready`: MCP server hooks marked with `@OnMcpServerStart` run automatically.
- On lifecycle `stopping`: hooks marked with `@OnMcpServerStop` run and MCP runtime is shut down.

## Resources

- Project site and documentation: [xtaskjs.io](https://xtaskjs.io)
- npm package: [@xtaskjs/mcp](https://www.npmjs.com/package/@xtaskjs/mcp)
- Source repository: [xtaskjs/xtaskjs](https://github.com/xtaskjs/xtaskjs)
