import { normalizeNamespace } from "./metadata";
import { SocketIoConfiguration } from "./types";

const defaultConfiguration: Required<SocketIoConfiguration> = {
  defaultNamespace: "/",
  serverOptions: {},
};

let currentConfiguration: Required<SocketIoConfiguration> = {
  ...defaultConfiguration,
};

export const configureSocketIo = (
  configuration: SocketIoConfiguration = {}
): Required<SocketIoConfiguration> => {
  currentConfiguration = {
    defaultNamespace: normalizeNamespace(
      configuration.defaultNamespace || currentConfiguration.defaultNamespace
    ),
    serverOptions: {
      ...(currentConfiguration.serverOptions || {}),
      ...(configuration.serverOptions || {}),
    },
  };

  return getSocketIoConfiguration();
};

export const getSocketIoConfiguration = (): Required<SocketIoConfiguration> => ({
  defaultNamespace: currentConfiguration.defaultNamespace,
  serverOptions: {
    ...(currentConfiguration.serverOptions || {}),
  },
});

export const resetSocketIoConfiguration = (): void => {
  currentConfiguration = {
    ...defaultConfiguration,
  };
};