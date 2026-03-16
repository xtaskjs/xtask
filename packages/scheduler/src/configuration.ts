import { SchedulerConfiguration } from "./types";

const defaultConfiguration: Required<SchedulerConfiguration> = {
  autoStart: true,
  defaultTimeZone: "UTC",
  failOnDuplicateJobNames: true,
};

let configuration: Required<SchedulerConfiguration> = { ...defaultConfiguration };

export const configureScheduler = (
  value: SchedulerConfiguration
): Required<SchedulerConfiguration> => {
  configuration = {
    ...configuration,
    ...value,
  };

  return getSchedulerConfiguration();
};

export const getSchedulerConfiguration = (): Required<SchedulerConfiguration> => {
  return { ...configuration };
};

export const resetSchedulerConfiguration = (): void => {
  configuration = { ...defaultConfiguration };
};