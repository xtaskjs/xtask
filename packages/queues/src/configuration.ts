import { createInMemoryQueueTransport } from "./in-memory.transport";
import { QueueConfiguration, RegisteredQueueTransportOptions } from "./types";

const defaultConfiguration: Required<QueueConfiguration> = {
  autoStart: true,
  defaultTransportName: "default",
  failOnDuplicateHandlerNames: true,
  rethrowUnhandledErrors: false,
  autoCreateDefaultInMemoryTransport: true,
};

let configuration: Required<QueueConfiguration> = { ...defaultConfiguration };

const registeredTransports = new Map<string, RegisteredQueueTransportOptions>();

export const configureQueues = (
  value: QueueConfiguration
): Required<QueueConfiguration> => {
  configuration = {
    ...configuration,
    ...value,
  };

  return getQueueConfiguration();
};

export const getQueueConfiguration = (): Required<QueueConfiguration> => {
  return { ...configuration };
};

export const resetQueueConfiguration = (): void => {
  configuration = { ...defaultConfiguration };
};

export const registerQueueTransport = (
  options: RegisteredQueueTransportOptions
): RegisteredQueueTransportOptions => {
  const name = options.name?.trim() || getQueueConfiguration().defaultTransportName;
  const definition: RegisteredQueueTransportOptions = {
    connectOnInitialize: options.connectOnInitialize !== false,
    disconnectOnShutdown: options.disconnectOnShutdown !== false,
    kind: options.kind || "custom",
    ...options,
    name,
  };

  registeredTransports.set(name, definition);
  return definition;
};

export const registerInMemoryQueueTransport = (
  options: Omit<RegisteredQueueTransportOptions, "transport"> = {}
): RegisteredQueueTransportOptions => {
  return registerQueueTransport({
    ...options,
    kind: options.kind || "in-memory",
    transport: () => createInMemoryQueueTransport(),
  });
};

export const getRegisteredQueueTransports = (): RegisteredQueueTransportOptions[] => {
  return Array.from(registeredTransports.values());
};

export const clearRegisteredQueueTransports = (): void => {
  registeredTransports.clear();
};