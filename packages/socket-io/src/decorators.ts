import { AutoWired, Qualifier } from "@xtaskjs/core";
import {
  getSocketIoLifecycleToken,
  getSocketIoNamespaceToken,
  getSocketIoServerToken,
  getSocketIoServiceToken,
} from "./tokens";
import {
  normalizeGroups,
  normalizeNamespace,
  registerSocketGatewayMetadata,
  registerSocketHandlerMetadata,
} from "./metadata";
import { SocketGatewayOptions, SocketHandlerMetadata, SocketHandlerOptions } from "./types";

const registerHandler = (
  target: any,
  propertyKey: string | symbol,
  metadata: Omit<SocketHandlerMetadata, "method">
): void => {
  registerSocketHandlerMetadata(target.constructor, {
    ...metadata,
    method: propertyKey,
  });
};

const createInjectionDecorator = (token: string): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const SocketGateway = (options: SocketGatewayOptions = {}): ClassDecorator => {
  return (target: any) => {
    registerSocketGatewayMetadata(target, {
      name: options.name?.trim() || undefined,
      namespace: normalizeNamespace(options.namespace),
      groups: normalizeGroups(options.group),
      disabled: options.disabled === true,
    });
  };
};

export const OnSocketConnection = (options: SocketHandlerOptions = {}): MethodDecorator => {
  return (target, propertyKey) => {
    registerHandler(target, propertyKey, {
      kind: "connection",
      name: options.name?.trim() || undefined,
      namespace: options.namespace ? normalizeNamespace(options.namespace) : undefined,
      once: false,
      disabled: options.disabled === true,
    });
  };
};

export const OnSocketDisconnect = (options: SocketHandlerOptions = {}): MethodDecorator => {
  return (target, propertyKey) => {
    registerHandler(target, propertyKey, {
      kind: "disconnect",
      name: options.name?.trim() || undefined,
      namespace: options.namespace ? normalizeNamespace(options.namespace) : undefined,
      once: false,
      disabled: options.disabled === true,
    });
  };
};

export const OnSocketEvent = (
  event: string,
  options: SocketHandlerOptions = {}
): MethodDecorator => {
  if (!event || !event.trim()) {
    throw new Error("OnSocketEvent requires a non-empty event name");
  }

  return (target, propertyKey) => {
    registerHandler(target, propertyKey, {
      kind: "event",
      event: event.trim(),
      name: options.name?.trim() || undefined,
      namespace: options.namespace ? normalizeNamespace(options.namespace) : undefined,
      once: options.once === true,
      disabled: options.disabled === true,
    });
  };
};

export const SubscribeMessage = OnSocketEvent;

export const InjectSocketService = (): ParameterDecorator & PropertyDecorator => {
  return createInjectionDecorator(getSocketIoServiceToken());
};

export const InjectSocketLifecycleManager = (): ParameterDecorator & PropertyDecorator => {
  return createInjectionDecorator(getSocketIoLifecycleToken());
};

export const InjectSocketServer = (): ParameterDecorator & PropertyDecorator => {
  return createInjectionDecorator(getSocketIoServerToken());
};

export const InjectSocketNamespace = (
  namespace = "/"
): ParameterDecorator & PropertyDecorator => {
  return createInjectionDecorator(getSocketIoNamespaceToken(namespace));
};