import type { Namespace, Server } from "socket.io";
import { getSocketIoLifecycleManager } from "./lifecycle";
import { SocketEmitOptions, SocketGatewaySummary } from "./types";

export class SocketIoService {
  getServer(): Server {
    return getSocketIoLifecycleManager().getServer();
  }

  getNamespace(namespace = "/"): Namespace {
    return getSocketIoLifecycleManager().getNamespace(namespace);
  }

  listNamespaces(): string[] {
    return getSocketIoLifecycleManager().listNamespaces();
  }

  listGateways(): SocketGatewaySummary[] {
    return getSocketIoLifecycleManager().listGateways();
  }

  emit(event: string, payload: any, options: SocketEmitOptions = {}): void {
    getSocketIoLifecycleManager().emit(event, payload, options);
  }
}