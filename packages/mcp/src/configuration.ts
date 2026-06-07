import type { McpConfiguration } from "./types";

const defaultConfiguration: Required<McpConfiguration> = {
  autoStart: true,
  failOnDuplicateServerNames: true,
};

let currentConfiguration: Required<McpConfiguration> = { ...defaultConfiguration };

export const configureMcp = (
  value: McpConfiguration = {}
): Required<McpConfiguration> => {
  currentConfiguration = {
    ...currentConfiguration,
    ...value,
  };

  return getMcpConfiguration();
};

export const getMcpConfiguration = (): Required<McpConfiguration> => {
  return { ...currentConfiguration };
};

export const resetMcpConfiguration = (): void => {
  currentConfiguration = { ...defaultConfiguration };
};
