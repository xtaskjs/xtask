const MAILER_SERVICE_TOKEN = "xtask:mailer:service";
const MAILER_LIFECYCLE_TOKEN = "xtask:mailer:lifecycle";
const MAILER_TRANSPORT_TOKEN_PREFIX = "xtask:mailer:transport";

export const getMailerServiceToken = (): string => MAILER_SERVICE_TOKEN;

export const getMailerLifecycleToken = (): string => MAILER_LIFECYCLE_TOKEN;

export const getMailerTransportToken = (name = "default"): string => {
  return `${MAILER_TRANSPORT_TOKEN_PREFIX}:${name}`;
};