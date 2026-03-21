const QUEUE_SERVICE_TOKEN = "xtask:queues:service";
const QUEUE_LIFECYCLE_TOKEN = "xtask:queues:lifecycle";
const QUEUE_TRANSPORT_TOKEN_PREFIX = "xtask:queues:transport";

export const getQueueServiceToken = (): string => QUEUE_SERVICE_TOKEN;

export const getQueueLifecycleToken = (): string => QUEUE_LIFECYCLE_TOKEN;

export const getQueueTransportToken = (name = "default"): string => {
  return `${QUEUE_TRANSPORT_TOKEN_PREFIX}:${name}`;
};