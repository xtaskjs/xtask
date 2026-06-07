import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { ApplicationLifeCycle, Container, Service } from "@xtaskjs/core";
import {
  InjectMcpService,
  McpPrompt,
  McpResource,
  McpServer,
  McpService,
  McpTool,
  OnMcpServerStart,
  OnMcpServerStop,
  getMcpServiceToken,
  initializeMcpIntegration,
  resetMcpIntegration,
} from "../src";

@Service()
@McpServer({
  name: "dev-tools",
  version: "1.0.0",
  instructions: "Expose small development helper tools",
  group: ["internal", "dev"],
})
class DevToolsMcpServer {
  public starts = 0;
  public stops = 0;

  @OnMcpServerStart()
  onStart() {
    this.starts += 1;
  }

  @OnMcpServerStop()
  onStop() {
    this.stops += 1;
  }

  @McpTool("echo", {
    description: "Echoes the payload",
    inputSchema: { type: "object" },
  })
  echo(payload: unknown) {
    return { payload };
  }

  @McpPrompt("welcome")
  welcome(input?: { name?: string }) {
    return `hello ${input?.name || "world"}`;
  }

  @McpResource("config://runtime", {
    name: "runtime-config",
    mimeType: "application/json",
  })
  runtimeConfig() {
    return { feature: "mcp", enabled: true };
  }
}

@Service()
class McpConsumer {
  constructor(@InjectMcpService() public readonly mcp: McpService) {}
}

describe("@xtaskjs/mcp", () => {
  beforeEach(async () => {
    await resetMcpIntegration();
  });

  afterEach(async () => {
    await resetMcpIntegration();
  });

  test("discovers decorated MCP servers and exposes them via service", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();

    container.register(DevToolsMcpServer, { scope: "singleton" });
    container.register(McpConsumer, { scope: "singleton" });

    await initializeMcpIntegration(container, lifecycle);

    const byToken = container.getByName<McpService>(getMcpServiceToken());
    const byInjection = container.get(McpConsumer).mcp;

    expect(byToken).toBeDefined();
    expect(byInjection).toBeDefined();

    const servers = byToken.listServers();
    expect(servers).toHaveLength(1);
    expect(servers[0].name).toBe("dev-tools");
    expect(servers[0].tools).toBe(1);
    expect(servers[0].prompts).toBe(1);
    expect(servers[0].resources).toBe(1);

    expect(byToken.listGroups()).toEqual(["dev", "internal"]);
  });

  test("starts and stops with lifecycle events and executes handlers", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();

    container.register(DevToolsMcpServer, { scope: "singleton" });

    await initializeMcpIntegration(container, lifecycle);

    const service = container.getByName<McpService>(getMcpServiceToken());
    const serverInstance = container.get(DevToolsMcpServer);

    expect(service.isStarted()).toBe(false);
    expect(serverInstance.starts).toBe(0);

    await lifecycle.emit("ready");

    expect(service.isStarted()).toBe(true);
    expect(serverInstance.starts).toBe(1);

    await expect(service.executeTool("dev-tools", "echo", { ok: true })).resolves.toEqual({
      payload: { ok: true },
    });

    await expect(service.renderPrompt("dev-tools", "welcome", { name: "xtask" })).resolves.toBe(
      "hello xtask"
    );

    await expect(service.readResource("dev-tools", "config://runtime")).resolves.toEqual({
      feature: "mcp",
      enabled: true,
    });

    await lifecycle.emit("stopping");

    expect(service.isStarted()).toBe(false);
    expect(serverInstance.stops).toBe(1);
  });
});
