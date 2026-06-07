import "reflect-metadata";
import type {
  McpLifecycleHookMetadata,
  McpMethodMetadata,
  McpServerMetadata,
} from "./types";

const MCP_SERVER_METADATA_KEY = Symbol("xtaskjs:mcp:server");
const MCP_METHOD_METADATA_KEY = Symbol("xtaskjs:mcp:methods");
const MCP_LIFECYCLE_HOOK_METADATA_KEY = Symbol("xtaskjs:mcp:lifecycle-hooks");

const normalizeName = (value?: string): string | undefined => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
};

export const normalizeGroups = (value?: string | string[]): string[] => {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      values
        .map((entry) => String(entry || "").trim())
        .filter((entry) => entry.length > 0)
    )
  );
};

export const registerMcpServerMetadata = (
  target: any,
  metadata: McpServerMetadata
): void => {
  Reflect.defineMetadata(MCP_SERVER_METADATA_KEY, {
    ...metadata,
    name: normalizeName(metadata.name),
    version: normalizeName(metadata.version),
    instructions: normalizeName(metadata.instructions),
    groups: normalizeGroups(metadata.groups),
    disabled: metadata.disabled === true,
  }, target);
};

export const getMcpServerMetadata = (target: any): McpServerMetadata | undefined => {
  const metadata = Reflect.getMetadata(MCP_SERVER_METADATA_KEY, target) as McpServerMetadata | undefined;
  if (!metadata) {
    return undefined;
  }

  return {
    ...metadata,
    name: normalizeName(metadata.name),
    version: normalizeName(metadata.version),
    instructions: normalizeName(metadata.instructions),
    groups: normalizeGroups(metadata.groups),
    disabled: metadata.disabled === true,
  };
};

export const registerMcpMethodMetadata = (
  target: any,
  metadata: McpMethodMetadata
): void => {
  const methods: McpMethodMetadata[] = getMcpMethodMetadata(target);
  methods.push(metadata);
  Reflect.defineMetadata(MCP_METHOD_METADATA_KEY, methods, target);
};

export const getMcpMethodMetadata = (target: any): McpMethodMetadata[] => {
  const methods = (Reflect.getMetadata(MCP_METHOD_METADATA_KEY, target) || []) as McpMethodMetadata[];
  return methods.map((method) => ({
    ...method,
    name: normalizeName(method.name),
    description: normalizeName(method.description),
  }));
};

export const registerMcpLifecycleHookMetadata = (
  target: any,
  metadata: McpLifecycleHookMetadata
): void => {
  const hooks: McpLifecycleHookMetadata[] = getMcpLifecycleHookMetadata(target);
  hooks.push({
    ...metadata,
    server: normalizeName(metadata.server),
  });

  Reflect.defineMetadata(MCP_LIFECYCLE_HOOK_METADATA_KEY, hooks, target);
};

export const getMcpLifecycleHookMetadata = (target: any): McpLifecycleHookMetadata[] => {
  const hooks = (Reflect.getMetadata(MCP_LIFECYCLE_HOOK_METADATA_KEY, target) || []) as McpLifecycleHookMetadata[];
  return hooks.map((hook) => ({
    ...hook,
    server: normalizeName(hook.server),
  }));
};
