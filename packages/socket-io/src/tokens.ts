import { normalizeNamespace } from "./metadata";

const SOCKET_IO_LIFECYCLE_TOKEN = "xtask:socket-io:lifecycle";
const SOCKET_IO_SERVICE_TOKEN = "xtask:socket-io:service";
const SOCKET_IO_SERVER_TOKEN = "xtask:socket-io:server";

export const getSocketIoLifecycleToken = (): string => SOCKET_IO_LIFECYCLE_TOKEN;

export const getSocketIoServiceToken = (): string => SOCKET_IO_SERVICE_TOKEN;

export const getSocketIoServerToken = (): string => SOCKET_IO_SERVER_TOKEN;

export const getSocketIoNamespaceToken = (namespace = "/"): string => {
  return `xtask:socket-io:namespace:${normalizeNamespace(namespace)}`;
};