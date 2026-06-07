import { getMcpLifecycleHookMetadata, getMcpMethodMetadata, getMcpServerMetadata } from "./metadata";
import type {
  ApplicationLifeCycle,
  Container,
} from "@xtaskjs/core";
import type {
  BuiltMcpPrompt,
  BuiltMcpResource,
  BuiltMcpServer,
  BuiltMcpTool,
  McpLifecycleHookMetadata,
  McpMethodMetadata,
  McpServerMetadata,
} from "./types";

interface BuildContext {
  container?: Container;
  lifecycle?: ApplicationLifeCycle;
}

interface BuildTarget {
  target: any;
  instance: any;
}

interface PreparedBuildTarget extends BuildTarget {
  serverMetadata: McpServerMetadata;
  methods: McpMethodMetadata[];
  hooks: McpLifecycleHookMetadata[];
}

const normalizeServerName = (targetName: string, metadata: McpServerMetadata): string => {
  const configuredName = metadata.name?.trim();
  if (configuredName) {
    return configuredName;
  }

  return targetName;
};

export class McpServerBuilder {
  build(input: BuildTarget, context: BuildContext = {}): BuiltMcpServer | undefined {
    const prepared = this.prepare(input);
    if (!prepared) {
      return undefined;
    }

    const targetName = prepared.target.name || "Anonymous";
    const serverName = normalizeServerName(targetName, prepared.serverMetadata);

    const tools = prepared.methods
      .filter((method) => method.kind === "tool")
      .map((method) => this.buildTool(serverName, prepared.instance, method, context));

    const prompts = prepared.methods
      .filter((method) => method.kind === "prompt")
      .map((method) => this.buildPrompt(serverName, prepared.instance, method, context));

    const resources = prepared.methods
      .filter((method) => method.kind === "resource")
      .map((method) => this.buildResource(serverName, prepared.instance, method, context));

    return {
      name: serverName,
      targetName,
      groups: [...prepared.serverMetadata.groups],
      version: prepared.serverMetadata.version,
      instructions: prepared.serverMetadata.instructions,
      disabled: prepared.serverMetadata.disabled,
      tools,
      prompts,
      resources,
      start: async () => {
        await this.runHooks(prepared.instance, prepared.hooks, "start", serverName);
      },
      stop: async () => {
        await this.runHooks(prepared.instance, prepared.hooks, "stop", serverName);
      },
    };
  }

  private prepare(input: BuildTarget): PreparedBuildTarget | undefined {
    const serverMetadata = getMcpServerMetadata(input.target);
    if (!serverMetadata) {
      return undefined;
    }

    return {
      ...input,
      serverMetadata,
      methods: getMcpMethodMetadata(input.target),
      hooks: getMcpLifecycleHookMetadata(input.target),
    };
  }

  private buildTool(
    serverName: string,
    instance: any,
    metadata: Extract<McpMethodMetadata, { kind: "tool" }>,
    context: BuildContext
  ): BuiltMcpTool {
    const name = metadata.name || String(metadata.method);
    const invoke = this.resolveMethod(instance, metadata.method, `tool:${name}`);

    return {
      name,
      description: metadata.description,
      disabled: metadata.disabled === true,
      inputSchema: metadata.inputSchema,
      outputSchema: metadata.outputSchema,
      execute: async (input?: unknown) => {
        return Promise.resolve(
          invoke(input, {
            container: context.container,
            lifecycle: context.lifecycle,
            serverName,
            toolName: name,
          })
        );
      },
    };
  }

  private buildPrompt(
    serverName: string,
    instance: any,
    metadata: Extract<McpMethodMetadata, { kind: "prompt" }>,
    context: BuildContext
  ): BuiltMcpPrompt {
    const name = metadata.name || String(metadata.method);
    const invoke = this.resolveMethod(instance, metadata.method, `prompt:${name}`);

    return {
      name,
      description: metadata.description,
      disabled: metadata.disabled === true,
      render: async (input?: unknown) => {
        return Promise.resolve(
          invoke(input, {
            container: context.container,
            lifecycle: context.lifecycle,
            serverName,
            promptName: name,
          })
        );
      },
    };
  }

  private buildResource(
    serverName: string,
    instance: any,
    metadata: Extract<McpMethodMetadata, { kind: "resource" }>,
    context: BuildContext
  ): BuiltMcpResource {
    const name = metadata.name || String(metadata.method);
    const invoke = this.resolveMethod(instance, metadata.method, `resource:${metadata.uriTemplate}`);

    return {
      uriTemplate: metadata.uriTemplate,
      name,
      description: metadata.description,
      disabled: metadata.disabled === true,
      mimeType: metadata.mimeType,
      read: async (input?: unknown) => {
        return Promise.resolve(
          invoke(input, {
            container: context.container,
            lifecycle: context.lifecycle,
            serverName,
            uriTemplate: metadata.uriTemplate,
          })
        );
      },
    };
  }

  private async runHooks(
    instance: any,
    hooks: McpLifecycleHookMetadata[],
    phase: "start" | "stop",
    serverName: string
  ): Promise<void> {
    const selectedHooks = hooks.filter((hook) => {
      if (hook.phase !== phase) {
        return false;
      }

      if (!hook.server) {
        return true;
      }

      return hook.server === serverName;
    });

    for (const hook of selectedHooks) {
      const invoke = this.resolveMethod(instance, hook.method, `hook:${phase}`);
      await Promise.resolve(invoke());
    }
  }

  private resolveMethod(instance: any, method: string | symbol, label: string): (...args: any[]) => any {
    const candidate = instance?.[method];
    if (typeof candidate !== "function") {
      throw new Error(`MCP ${label} is not a function on ${instance?.constructor?.name || "Unknown"}`);
    }

    return candidate.bind(instance);
  }
}
