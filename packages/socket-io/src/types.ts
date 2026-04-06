import type { Server as HttpServer } from "http";
import type { ApplicationLifeCycle, Container, HttpAdapter } from "@xtaskjs/core";
import type { Namespace, Server, ServerOptions, Socket } from "socket.io";

export type SocketIoAttachTarget =
  | HttpAdapter
  | HttpServer
  | {
      getHttpServer?: () => HttpServer | undefined;
      getNativeApp?: () => any;
      type?: string;
    };

export interface SocketIoConfiguration {
  defaultNamespace?: string;
  serverOptions?: Partial<ServerOptions>;
}

export interface SocketGatewayOptions {
  name?: string;
  namespace?: string;
  group?: string | string[];
  disabled?: boolean;
}

export interface SocketGatewayMetadata {
  name?: string;
  namespace: string;
  groups: string[];
  disabled: boolean;
}

export type SocketHandlerKind = "connection" | "disconnect" | "event";

export interface SocketHandlerOptions {
  name?: string;
  namespace?: string;
  once?: boolean;
  disabled?: boolean;
}

export interface SocketHandlerMetadata {
  kind: SocketHandlerKind;
  method: string | symbol;
  event?: string;
  name?: string;
  namespace?: string;
  once?: boolean;
  disabled?: boolean;
}

export interface SocketHandlerContext {
  socket: Socket;
  server: Server;
  namespace: Namespace;
  container?: Container;
  lifecycle?: ApplicationLifeCycle;
  gateway: string;
  event?: string;
  ack?: (...args: any[]) => void;
  adapter?: SocketIoAttachTarget;
}

export interface SocketHandlerSummary {
  name: string;
  kind: SocketHandlerKind;
  event?: string;
  namespace: string;
  methodName: string;
  once: boolean;
  disabled: boolean;
}

export interface SocketGatewaySummary {
  name: string;
  namespace: string;
  targetName: string;
  groups: string[];
  disabled: boolean;
  handlers: SocketHandlerSummary[];
}

export interface SocketEmitOptions {
  namespace?: string;
  room?: string | string[];
  except?: string | string[];
  volatile?: boolean;
  local?: boolean;
  compress?: boolean;
  timeoutMs?: number;
}