import type { ApplicationLifeCycle, Container } from "@xtaskjs/core";
import { getMcpConfiguration, resetMcpConfiguration } from "./configuration";
import { McpServerBuilder } from "./builder";
import { McpService } from "./mcp.service";
import { getMcpLifecycleToken, getMcpServiceToken } from "./tokens";
import type {
  BuiltMcpServer,
  McpMethodSummary,
  McpServerSummary,
} from "./types";

export class McpLifecycleManager {
  private readonly builder = new McpServerBuilder();
  private readonly servers = new Map<string, BuiltMcpServer>();
  private container?: Container;
  private lifecycle?: ApplicationLifeCycle;
  private started = false;

  async initialize(container?: Container, lifecycle?: ApplicationLifeCycle): Promise<void> {
    await this.destroy();
    this.container = container;
    this.lifecycle = lifecycle;

    this.registerContainerBindings(container);
    this.discoverServers(container);

    if (lifecycle && typeof (lifecycle as any).on === "function") {
      lifecycle.on("ready", async () => {
        if (getMcpConfiguration().autoStart) {
          await this.startAll();
        }
      });

      lifecycle.on("stopping", async () => {
        await this.stopAll();
      });
    }
  }

  async destroy(): Promise<void> {
    await this.stopAll();
    this.servers.clear();
    this.container = undefined;
    this.lifecycle = undefined;
    this.started = false;
  }

  getContainer(): Container | undefined {
    return this.container;
  }

  isStarted(): boolean {
    return this.started;
  }

  listServers(group?: string): McpServerSummary[] {
    const normalizedGroup = group?.trim();

    return Array.from(this.servers.values())
      .filter((server) => !normalizedGroup || server.groups.includes(normalizedGroup))
      .map((server) => ({
        name: server.name,
        targetName: server.targetName,
        groups: [...server.groups],
        version: server.version,
        instructions: server.instructions,
        disabled: server.disabled,
        started: this.started,
        tools: server.tools.length,
        prompts: server.prompts.length,
        resources: server.resources.length,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  listMethods(serverName?: string): McpMethodSummary[] {
    const serverFilter = serverName?.trim();
    const summaries: McpMethodSummary[] = [];

    for (const server of this.servers.values()) {
      if (serverFilter && server.name !== serverFilter) {
        continue;
      }

      for (const tool of server.tools) {
        summaries.push({
          serverName: server.name,
          kind: "tool",
          name: tool.name,
          methodName: tool.name,
          description: tool.description,
          disabled: tool.disabled,
        });
      }

      for (const prompt of server.prompts) {
        summaries.push({
          serverName: server.name,
          kind: "prompt",
          name: prompt.name,
          methodName: prompt.name,
          description: prompt.description,
          disabled: prompt.disabled,
        });
      }

      for (const resource of server.resources) {
        summaries.push({
          serverName: server.name,
          kind: "resource",
          name: resource.name,
          methodName: resource.name,
          description: resource.description,
          disabled: resource.disabled,
          uriTemplate: resource.uriTemplate,
          mimeType: resource.mimeType,
        });
      }
    }

    return summaries.sort((left, right) => {
      const serverCompare = left.serverName.localeCompare(right.serverName);
      if (serverCompare !== 0) {
        return serverCompare;
      }

      return left.name.localeCompare(right.name);
    });
  }

  listGroups(): string[] {
    return Array.from(
      new Set(Array.from(this.servers.values()).flatMap((server) => server.groups))
    ).sort();
  }

  getServer(name: string): BuiltMcpServer {
    const server = this.servers.get(name);
    if (!server) {
      throw new Error(`MCP server '${name}' is not registered`);
    }

    return server;
  }

  async startAll(): Promise<void> {
    for (const server of this.servers.values()) {
      if (server.disabled) {
        continue;
      }

      await server.start();
    }

    this.started = true;
  }

  async stopAll(): Promise<void> {
    for (const server of this.servers.values()) {
      if (server.disabled) {
        continue;
      }

      await server.stop();
    }

    this.started = false;
  }

  async executeTool(serverName: string, toolName: string, input?: unknown): Promise<unknown> {
    const server = this.getServer(serverName);
    const tool = server.tools.find((entry) => entry.name === toolName);
    if (!tool || tool.disabled) {
      throw new Error(`MCP tool '${toolName}' is not registered on server '${serverName}'`);
    }

    return tool.execute(input);
  }

  async renderPrompt(serverName: string, promptName: string, input?: unknown): Promise<unknown> {
    const server = this.getServer(serverName);
    const prompt = server.prompts.find((entry) => entry.name === promptName);
    if (!prompt || prompt.disabled) {
      throw new Error(`MCP prompt '${promptName}' is not registered on server '${serverName}'`);
    }

    return prompt.render(input);
  }

  async readResource(serverName: string, uriTemplate: string, input?: unknown): Promise<unknown> {
    const server = this.getServer(serverName);
    const resource = server.resources.find((entry) => entry.uriTemplate === uriTemplate);
    if (!resource || resource.disabled) {
      throw new Error(`MCP resource '${uriTemplate}' is not registered on server '${serverName}'`);
    }

    return resource.read(input);
  }

  private discoverServers(container?: Container): void {
    if (!container || typeof (container as any).getRegisteredTypes !== "function") {
      return;
    }

    const configuration = getMcpConfiguration();
    const registeredTypes = (container as any).getRegisteredTypes() as any[];

    for (const type of registeredTypes) {
      const instance = container.get(type);
      const built = this.builder.build(
        { target: type, instance },
        {
          container,
          lifecycle: this.lifecycle,
        }
      );

      if (!built) {
        continue;
      }

      if (this.servers.has(built.name) && configuration.failOnDuplicateServerNames) {
        throw new Error(`Duplicate MCP server name '${built.name}' detected`);
      }

      this.servers.set(built.name, built);
    }
  }

  private registerContainerBindings(container?: Container): void {
    if (!container) {
      return;
    }

    const anyContainer = container as any;
    if (typeof anyContainer.registerNamedInstance === "function") {
      anyContainer.registerNamedInstance(getMcpLifecycleToken(), this);
    }

    if (typeof anyContainer.registerWithName === "function") {
      anyContainer.registerWithName(McpService, { scope: "singleton" }, getMcpServiceToken());
    }
  }
}

const lifecycleManager = new McpLifecycleManager();

export const initializeMcpIntegration = async (
  container?: Container,
  lifecycle?: ApplicationLifeCycle
): Promise<void> => {
  await lifecycleManager.initialize(container, lifecycle);
};

export const shutdownMcpIntegration = async (): Promise<void> => {
  await lifecycleManager.destroy();
};

export const getMcpLifecycleManager = (): McpLifecycleManager => {
  return lifecycleManager;
};

export const resetMcpIntegration = async (): Promise<void> => {
  await shutdownMcpIntegration();
  resetMcpConfiguration();
};
