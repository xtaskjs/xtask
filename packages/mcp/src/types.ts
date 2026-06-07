import type { ApplicationLifeCycle, Container } from "@xtaskjs/core";

export type McpMethodKind = "tool" | "prompt" | "resource";

export interface McpServerOptions {
  name?: string;
  version?: string;
  instructions?: string;
  group?: string | string[];
  disabled?: boolean;
}

export interface McpMethodBaseOptions {
  name?: string;
  description?: string;
  disabled?: boolean;
}

export interface McpToolOptions extends McpMethodBaseOptions {
  inputSchema?: unknown;
  outputSchema?: unknown;
}

export interface McpPromptOptions extends McpMethodBaseOptions {}

export interface McpResourceOptions extends McpMethodBaseOptions {
  mimeType?: string;
}

export interface McpLifecycleHookOptions {
  server?: string;
}

export interface McpServerMetadata {
  name?: string;
  version?: string;
  instructions?: string;
  groups: string[];
  disabled: boolean;
}

export interface McpToolMetadata {
  kind: "tool";
  method: string | symbol;
  name?: string;
  description?: string;
  disabled?: boolean;
  inputSchema?: unknown;
  outputSchema?: unknown;
}

export interface McpPromptMetadata {
  kind: "prompt";
  method: string | symbol;
  name?: string;
  description?: string;
  disabled?: boolean;
}

export interface McpResourceMetadata {
  kind: "resource";
  method: string | symbol;
  uriTemplate: string;
  name?: string;
  description?: string;
  disabled?: boolean;
  mimeType?: string;
}

export interface McpLifecycleHookMetadata {
  phase: "start" | "stop";
  method: string | symbol;
  server?: string;
}

export type McpMethodMetadata = McpToolMetadata | McpPromptMetadata | McpResourceMetadata;

export interface McpToolContext {
  container?: Container;
  lifecycle?: ApplicationLifeCycle;
  serverName: string;
  toolName: string;
}

export interface McpPromptContext {
  container?: Container;
  lifecycle?: ApplicationLifeCycle;
  serverName: string;
  promptName: string;
}

export interface McpResourceContext {
  container?: Container;
  lifecycle?: ApplicationLifeCycle;
  serverName: string;
  uriTemplate: string;
}

export interface BuiltMcpTool {
  name: string;
  description?: string;
  disabled: boolean;
  inputSchema?: unknown;
  outputSchema?: unknown;
  execute: (input?: unknown) => Promise<unknown>;
}

export interface BuiltMcpPrompt {
  name: string;
  description?: string;
  disabled: boolean;
  render: (input?: unknown) => Promise<unknown>;
}

export interface BuiltMcpResource {
  uriTemplate: string;
  name: string;
  description?: string;
  disabled: boolean;
  mimeType?: string;
  read: (input?: unknown) => Promise<unknown>;
}

export interface BuiltMcpServer {
  name: string;
  targetName: string;
  groups: string[];
  version?: string;
  instructions?: string;
  disabled: boolean;
  tools: BuiltMcpTool[];
  prompts: BuiltMcpPrompt[];
  resources: BuiltMcpResource[];
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export interface McpServerSummary {
  name: string;
  targetName: string;
  groups: string[];
  version?: string;
  instructions?: string;
  disabled: boolean;
  started: boolean;
  tools: number;
  prompts: number;
  resources: number;
}

export interface McpMethodSummary {
  serverName: string;
  kind: McpMethodKind;
  name: string;
  methodName: string;
  description?: string;
  disabled: boolean;
  uriTemplate?: string;
  mimeType?: string;
}

export interface McpConfiguration {
  autoStart?: boolean;
  failOnDuplicateServerNames?: boolean;
}
