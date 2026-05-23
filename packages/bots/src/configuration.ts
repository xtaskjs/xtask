import type { BotsConfiguration } from "./types";

const defaultConfiguration: Required<BotsConfiguration> = {
  autoStart: true,
  failOnDuplicateGatewayNames: true,
  throwOnUnhandled: false,
};

let currentConfiguration: Required<BotsConfiguration> = {
  ...defaultConfiguration,
};

export const configureBots = (
  configuration: BotsConfiguration = {}
): Required<BotsConfiguration> => {
  currentConfiguration = {
    ...currentConfiguration,
    ...configuration,
  };

  return getBotsConfiguration();
};

export const getBotsConfiguration = (): Required<BotsConfiguration> => {
  return { ...currentConfiguration };
};

export const resetBotsConfiguration = (): void => {
  currentConfiguration = { ...defaultConfiguration };
};
