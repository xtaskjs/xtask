import { SocketGatewayMetadata, SocketHandlerMetadata } from "./types";

const SOCKET_GATEWAY_METADATA_KEY = "xtask:socket-io:gateway";
const SOCKET_HANDLER_METADATA_KEY = "xtask:socket-io:handlers";

export const normalizeNamespace = (value?: string): string => {
  const normalizedValue = String(value || "/").trim();
  if (!normalizedValue || normalizedValue === "/") {
    return "/";
  }

  const withLeadingSlash = normalizedValue.startsWith("/") ? normalizedValue : `/${normalizedValue}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
};

export const normalizeGroups = (value?: string | string[]): string[] => {
  if (!value) {
    return [];
  }

  const groups = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      groups
        .map((group) => group.trim())
        .filter((group) => group.length > 0)
    )
  );
};

export const registerSocketGatewayMetadata = (
  target: any,
  metadata: SocketGatewayMetadata
): void => {
  Reflect.defineMetadata(SOCKET_GATEWAY_METADATA_KEY, metadata, target);
};

export const getSocketGatewayMetadata = (target: any): SocketGatewayMetadata | undefined => {
  return Reflect.getMetadata(SOCKET_GATEWAY_METADATA_KEY, target);
};

export const registerSocketHandlerMetadata = (
  target: any,
  metadata: SocketHandlerMetadata
): void => {
  const existingMetadata = getSocketHandlerMetadata(target);
  existingMetadata.push(metadata);
  Reflect.defineMetadata(SOCKET_HANDLER_METADATA_KEY, existingMetadata, target);
};

export const getSocketHandlerMetadata = (target: any): SocketHandlerMetadata[] => {
  return Reflect.getMetadata(SOCKET_HANDLER_METADATA_KEY, target) || [];
};