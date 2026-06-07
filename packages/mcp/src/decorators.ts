import { AutoWired, Qualifier } from "@xtaskjs/core";
import {
  getMcpLifecycleToken,
  getMcpServiceToken,
} from "./tokens";
import {
  registerMcpLifecycleHookMetadata,
  registerMcpMethodMetadata,
  registerMcpServerMetadata,
} from "./metadata";
import type {
  McpLifecycleHookOptions,
  McpPromptOptions,
  McpResourceOptions,
  McpServerOptions,
  McpToolOptions,
} from "./types";

export const McpServer = (options: McpServerOptions = {}): ClassDecorator => {
  return (target) => {
    registerMcpServerMetadata(target, {
      name: options.name,
      version: options.version,
      instructions: options.instructions,
      groups: options.group ? (Array.isArray(options.group) ? options.group : [options.group]) : [],
      disabled: options.disabled === true,
    });
  };
};

export const McpTool = (
  name: string,
  options: McpToolOptions = {}
): MethodDecorator => {
  const normalizedName = String(name || "").trim();
  if (!normalizedName) {
    throw new Error("McpTool requires a non-empty name");
  }

  return (target, propertyKey) => {
    registerMcpMethodMetadata(target.constructor, {
      kind: "tool",
      method: propertyKey,
      name: normalizedName,
      description: options.description,
      disabled: options.disabled,
      inputSchema: options.inputSchema,
      outputSchema: options.outputSchema,
    });
  };
};

export const McpPrompt = (
  name: string,
  options: McpPromptOptions = {}
): MethodDecorator => {
  const normalizedName = String(name || "").trim();
  if (!normalizedName) {
    throw new Error("McpPrompt requires a non-empty name");
  }

  return (target, propertyKey) => {
    registerMcpMethodMetadata(target.constructor, {
      kind: "prompt",
      method: propertyKey,
      name: normalizedName,
      description: options.description,
      disabled: options.disabled,
    });
  };
};

export const McpResource = (
  uriTemplate: string,
  options: McpResourceOptions = {}
): MethodDecorator => {
  const normalizedUri = String(uriTemplate || "").trim();
  if (!normalizedUri) {
    throw new Error("McpResource requires a non-empty uriTemplate");
  }

  return (target, propertyKey) => {
    registerMcpMethodMetadata(target.constructor, {
      kind: "resource",
      method: propertyKey,
      uriTemplate: normalizedUri,
      name: options.name,
      description: options.description,
      disabled: options.disabled,
      mimeType: options.mimeType,
    });
  };
};

export const OnMcpServerStart = (
  options: McpLifecycleHookOptions = {}
): MethodDecorator => {
  return (target, propertyKey) => {
    registerMcpLifecycleHookMetadata(target.constructor, {
      phase: "start",
      method: propertyKey,
      server: options.server,
    });
  };
};

export const OnMcpServerStop = (
  options: McpLifecycleHookOptions = {}
): MethodDecorator => {
  return (target, propertyKey) => {
    registerMcpLifecycleHookMetadata(target.constructor, {
      phase: "stop",
      method: propertyKey,
      server: options.server,
    });
  };
};

const createQualifierDecorator = (
  tokenFactory: () => string
): (() => ParameterDecorator & PropertyDecorator) => {
  return () => {
    return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
      const token = tokenFactory();

      if (typeof parameterIndex === "number") {
        Qualifier(token)(target, propertyKey, parameterIndex);
        return;
      }

      if (propertyKey !== undefined) {
        AutoWired({ qualifier: token })(target, propertyKey);
      }
    };
  };
};

export const InjectMcpService = createQualifierDecorator(getMcpServiceToken);
export const InjectMcpLifecycleManager = createQualifierDecorator(getMcpLifecycleToken);
