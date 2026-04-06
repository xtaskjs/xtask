import { ApplicationLifeCycle, Container, HttpAdapter } from "@xtaskjs/core";
import type { Namespace, Server, Socket } from "socket.io";
import { Server as SocketIoServer } from "socket.io";
import { getSocketIoConfiguration, resetSocketIoConfiguration } from "./configuration";
import { getSocketGatewayMetadata, getSocketHandlerMetadata, normalizeNamespace } from "./metadata";
import { SocketIoService } from "./socket-io.service";
import {
  getSocketIoLifecycleToken,
  getSocketIoNamespaceToken,
  getSocketIoServerToken,
  getSocketIoServiceToken,
} from "./tokens";
import {
  SocketEmitOptions,
  SocketGatewayMetadata,
  SocketGatewaySummary,
  SocketHandlerContext,
  SocketHandlerKind,
  SocketHandlerSummary,
  SocketIoAttachTarget,
} from "./types";

interface DiscoveredHandler {
  name: string;
  kind: SocketHandlerKind;
  event?: string;
  namespace: string;
  methodName: string;
  once: boolean;
  disabled: boolean;
}

interface DiscoveredGateway {
  name: string;
  namespace: string;
  targetName: string;
  groups: string[];
  disabled: boolean;
  instance: any;
  handlers: DiscoveredHandler[];
}

const isHttpServerLike = (value: any): boolean => {
  return Boolean(value) && typeof value.on === "function" && typeof value.listen === "function";
};

const normalizeHandlerName = (
  gateway: SocketGatewayMetadata,
  targetName: string,
  methodName: string,
  event?: string
): string => {
  if (gateway.name && gateway.name.trim()) {
    return `${gateway.name.trim()}.${event || methodName}`;
  }

  return `${targetName}.${methodName}`;
};

export class SocketIoLifecycleManager {
  private readonly gateways = new Map<string, DiscoveredGateway>();
  private readonly namespaces = new Map<string, Namespace>();
  private container?: Container;
  private lifecycle?: ApplicationLifeCycle;
  private adapter?: SocketIoAttachTarget;
  private server?: Server;

  async initialize(
    container?: Container,
    lifecycle?: ApplicationLifeCycle,
    attachTarget?: SocketIoAttachTarget
  ): Promise<void> {
    await this.destroy();
    this.container = container;
    this.lifecycle = lifecycle;
    this.adapter = attachTarget;

    this.registerContainerBindings(container);

    if (attachTarget) {
      await this.attach(attachTarget);
    }

    this.discoverGateways(container);
    this.bindGateways();

    if (lifecycle && typeof (lifecycle as any).on === "function") {
      lifecycle.on("stopping", async () => {
        await this.closeServer();
      });
    }
  }

  async destroy(): Promise<void> {
    await this.closeServer();
    this.gateways.clear();
    this.namespaces.clear();
    this.container = undefined;
    this.lifecycle = undefined;
    this.adapter = undefined;
  }

  getServer(): Server {
    if (!this.server) {
      throw new Error("Socket.IO server is not initialized. Call initializeSocketIoIntegration() after app.listen().");
    }

    return this.server;
  }

  getNamespace(namespace = "/"): Namespace {
    const normalizedNamespace = normalizeNamespace(namespace);
    const discoveredNamespace = this.namespaces.get(normalizedNamespace);
    if (discoveredNamespace) {
      return discoveredNamespace;
    }

    if (!this.server) {
      throw new Error("Socket.IO server is not initialized. Call initializeSocketIoIntegration() after app.listen().");
    }

    return this.ensureNamespace(normalizedNamespace);
  }

  listNamespaces(): string[] {
    const names = new Set<string>([getSocketIoConfiguration().defaultNamespace]);

    for (const gateway of this.gateways.values()) {
      names.add(gateway.namespace);
      for (const handler of gateway.handlers) {
        names.add(handler.namespace);
      }
    }

    for (const namespace of this.namespaces.keys()) {
      names.add(namespace);
    }

    return Array.from(names).sort();
  }

  listGateways(): SocketGatewaySummary[] {
    return Array.from(this.gateways.values())
      .map((gateway) => ({
        name: gateway.name,
        namespace: gateway.namespace,
        targetName: gateway.targetName,
        groups: [...gateway.groups],
        disabled: gateway.disabled,
        handlers: gateway.handlers.map<SocketHandlerSummary>((handler) => ({
          name: handler.name,
          kind: handler.kind,
          event: handler.event,
          namespace: handler.namespace,
          methodName: handler.methodName,
          once: handler.once,
          disabled: handler.disabled,
        })),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  emit(event: string, payload: any, options: SocketEmitOptions = {}): void {
    if (!event || !event.trim()) {
      throw new Error("Socket.IO emit requires a non-empty event name");
    }

    const emitter = this.resolveEmitter(options);
    emitter.emit(event.trim(), payload);
  }

  private async attach(target: SocketIoAttachTarget): Promise<void> {
    const httpServer = this.resolveHttpServer(target);
    if (!httpServer) {
      throw new Error(
        "Socket.IO integration requires a Node HTTP server or an HTTP adapter exposing getHttpServer()"
      );
    }

    this.server = new SocketIoServer(httpServer as any, {
      ...(getSocketIoConfiguration().serverOptions || {}),
    });

    this.registerRuntimeBindings();
  }

  private resolveHttpServer(target?: SocketIoAttachTarget): any {
    if (!target) {
      return undefined;
    }

    if (isHttpServerLike(target)) {
      return target;
    }

    if (typeof (target as HttpAdapter).getHttpServer === "function") {
      return (target as HttpAdapter).getHttpServer?.();
    }

    if (typeof (target as any).getHttpServer === "function") {
      return (target as any).getHttpServer();
    }

    return undefined;
  }

  private discoverGateways(container?: Container): void {
    if (!container || typeof (container as any).getRegisteredTypes !== "function") {
      return;
    }

    const registeredTypes = (container as any).getRegisteredTypes() as any[];

    for (const type of registeredTypes) {
      const gatewayMetadata = getSocketGatewayMetadata(type);
      if (!gatewayMetadata) {
        continue;
      }

      const targetName = type.name || "Anonymous";
      const namespace = normalizeNamespace(gatewayMetadata.namespace);
      if (this.server) {
        this.ensureNamespace(namespace);
      }

      const handlerMetadata = getSocketHandlerMetadata(type).map((handler) => {
        const methodName = String(handler.method);
        const handlerNamespace = normalizeNamespace(handler.namespace || namespace);
        if (this.server) {
          this.ensureNamespace(handlerNamespace);
        }

        return {
          name: handler.name?.trim() || normalizeHandlerName(gatewayMetadata, targetName, methodName, handler.event),
          kind: handler.kind,
          event: handler.event,
          namespace: handlerNamespace,
          methodName,
          once: handler.once === true,
          disabled: handler.disabled === true,
        } as DiscoveredHandler;
      });

      const instance = container.get(type);
      const gatewayName = gatewayMetadata.name?.trim() || targetName;
      this.gateways.set(gatewayName, {
        name: gatewayName,
        namespace,
        targetName,
        groups: [...gatewayMetadata.groups],
        disabled: gatewayMetadata.disabled,
        instance,
        handlers: handlerMetadata,
      });
    }
  }

  private bindGateways(): void {
    if (!this.server) {
      return;
    }

    for (const gateway of this.gateways.values()) {
      if (gateway.disabled) {
        continue;
      }

      const namespace = this.ensureNamespace(gateway.namespace);
      namespace.on("connection", (socket: Socket) => {
        void this.handleConnection(gateway, namespace, socket);
      });
    }
  }

  private async handleConnection(
    gateway: DiscoveredGateway,
    namespace: Namespace,
    socket: Socket
  ): Promise<void> {
    for (const handler of gateway.handlers) {
      if (handler.disabled || handler.namespace !== gateway.namespace) {
        continue;
      }

      if (handler.kind === "connection") {
        await this.invokeHandler(gateway, handler, [socket], namespace, socket);
      }
    }

    for (const handler of gateway.handlers) {
      if (handler.disabled || handler.namespace !== gateway.namespace) {
        continue;
      }

      if (handler.kind === "disconnect") {
        socket.on("disconnect", (reason: string) => {
          void this.invokeHandler(gateway, handler, [reason, socket], namespace, socket);
        });
        continue;
      }

      if (handler.kind !== "event" || !handler.event) {
        continue;
      }

      const subscribe = handler.once ? socket.once.bind(socket) : socket.on.bind(socket);
      subscribe(handler.event, (...args: any[]) => {
        void this.invokeEventHandler(gateway, handler, args, namespace, socket);
      });
    }
  }

  private async invokeEventHandler(
    gateway: DiscoveredGateway,
    handler: DiscoveredHandler,
    args: any[],
    namespace: Namespace,
    socket: Socket
  ): Promise<void> {
    const maybeAck = args.length > 0 && typeof args[args.length - 1] === "function" ? args[args.length - 1] : undefined;
    const payloadArgs = maybeAck ? args.slice(0, -1) : args;

    try {
      const result = await this.invokeHandler(gateway, handler, payloadArgs, namespace, socket, maybeAck);
      if (maybeAck && result !== undefined) {
        maybeAck(result);
      }
    } catch (error) {
      await this.reportError(error);
    }
  }

  private async invokeHandler(
    gateway: DiscoveredGateway,
    handler: DiscoveredHandler,
    args: any[],
    namespace: Namespace,
    socket: Socket,
    ack?: (...args: any[]) => void
  ): Promise<any> {
    try {
      const context: SocketHandlerContext = {
        socket,
        server: this.getServer(),
        namespace,
        container: this.container,
        lifecycle: this.lifecycle,
        gateway: gateway.name,
        event: handler.event,
        ack,
        adapter: this.adapter,
      };

      if (handler.kind === "connection") {
        return await Promise.resolve(gateway.instance[handler.methodName].call(gateway.instance, socket, context));
      }

      if (handler.kind === "disconnect") {
        const [reason] = args;
        return await Promise.resolve(
          gateway.instance[handler.methodName].call(gateway.instance, reason, socket, context)
        );
      }

      return await Promise.resolve(
        gateway.instance[handler.methodName].call(gateway.instance, ...args, context)
      );
    } catch (error) {
      await this.reportError(error);
      throw error;
    }
  }

  private async reportError(error: any): Promise<void> {
    if (this.lifecycle && typeof (this.lifecycle as any).emit === "function") {
      await (this.lifecycle as any).emit("error", error);
    }
  }

  private resolveEmitter(options: SocketEmitOptions): any {
    let emitter: any = this.getNamespace(options.namespace || getSocketIoConfiguration().defaultNamespace);

    const rooms = Array.isArray(options.room) ? options.room : options.room ? [options.room] : [];
    for (const room of rooms) {
      emitter = emitter.to(room);
    }

    const excludedRooms = Array.isArray(options.except)
      ? options.except
      : options.except
        ? [options.except]
        : [];
    for (const room of excludedRooms) {
      if (typeof emitter.except === "function") {
        emitter = emitter.except(room);
      }
    }

    if (options.volatile && emitter.volatile) {
      emitter = emitter.volatile;
    }

    if (options.local && emitter.local) {
      emitter = emitter.local;
    }

    if (options.compress === false && typeof emitter.compress === "function") {
      emitter = emitter.compress(false);
    }

    if (typeof options.timeoutMs === "number" && typeof emitter.timeout === "function") {
      emitter = emitter.timeout(options.timeoutMs);
    }

    return emitter;
  }

  private ensureNamespace(namespaceName: string): Namespace {
    const normalizedNamespace = normalizeNamespace(namespaceName);
    const existingNamespace = this.namespaces.get(normalizedNamespace);
    if (existingNamespace) {
      return existingNamespace;
    }

    const namespace = this.getServer().of(normalizedNamespace);
    this.namespaces.set(normalizedNamespace, namespace);
    if (this.container && typeof (this.container as any).registerNamedInstance === "function") {
      (this.container as any).registerNamedInstance(getSocketIoNamespaceToken(normalizedNamespace), namespace);
    }
    return namespace;
  }

  private registerContainerBindings(container?: Container): void {
    if (!container) {
      return;
    }

    const anyContainer = container as any;
    if (typeof anyContainer.registerNamedInstance === "function") {
      anyContainer.registerNamedInstance(getSocketIoLifecycleToken(), this);
    }

    if (typeof anyContainer.registerWithName === "function") {
      anyContainer.registerWithName(SocketIoService, { scope: "singleton" }, getSocketIoServiceToken());
    }
  }

  private registerRuntimeBindings(): void {
    if (!this.container || !this.server || typeof (this.container as any).registerNamedInstance !== "function") {
      return;
    }

    const anyContainer = this.container as any;
    anyContainer.registerNamedInstance(getSocketIoServerToken(), this.server);
    this.ensureNamespace(getSocketIoConfiguration().defaultNamespace);
  }

  private async closeServer(): Promise<void> {
    if (!this.server) {
      return;
    }

    const server = this.server;
    this.server = undefined;
    this.namespaces.clear();

    await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

const lifecycleManager = new SocketIoLifecycleManager();

export const initializeSocketIoIntegration = async (
  container?: Container,
  lifecycle?: ApplicationLifeCycle,
  attachTarget?: SocketIoAttachTarget
): Promise<void> => {
  await lifecycleManager.initialize(container, lifecycle, attachTarget);
};

export const shutdownSocketIoIntegration = async (): Promise<void> => {
  await lifecycleManager.destroy();
};

export const getSocketIoLifecycleManager = (): SocketIoLifecycleManager => lifecycleManager;

export const resetSocketIoIntegration = async (): Promise<void> => {
  await shutdownSocketIoIntegration();
  resetSocketIoConfiguration();
};