const SCHEDULER_LIFECYCLE_TOKEN = "xtask:scheduler:lifecycle";
const SCHEDULER_SERVICE_TOKEN = "xtask:scheduler:service";

export const getSchedulerLifecycleToken = (): string => {
  return SCHEDULER_LIFECYCLE_TOKEN;
};

export const getSchedulerServiceToken = (): string => {
  return SCHEDULER_SERVICE_TOKEN;
};