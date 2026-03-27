import { MessageReference } from "./types";

const CQRS_LIFECYCLE_TOKEN = "xtask:cqrs:lifecycle";
const COMMAND_BUS_TOKEN = "xtask:cqrs:command-bus";
const QUERY_BUS_TOKEN = "xtask:cqrs:query-bus";
const EVENT_BUS_TOKEN = "xtask:cqrs:event-bus";
const IDEMPOTENCY_STORE_TOKEN = "xtask:cqrs:idempotency-store";
const READ_DATA_SOURCE_TOKEN = "xtask:cqrs:datasource:read";
const WRITE_DATA_SOURCE_TOKEN = "xtask:cqrs:datasource:write";
const READ_REPOSITORY_TOKEN_PREFIX = "xtask:cqrs:repository:read";
const WRITE_REPOSITORY_TOKEN_PREFIX = "xtask:cqrs:repository:write";
const COMMAND_HANDLER_TOKEN_PREFIX = "xtask:cqrs:handler:command";
const QUERY_HANDLER_TOKEN_PREFIX = "xtask:cqrs:handler:query";
const PROJECTION_REBUILDER_TOKEN_PREFIX = "xtask:cqrs:projection-rebuilder";

const resolveReferenceName = (reference: MessageReference | string): string => {
  if (typeof reference === "string") {
    const normalized = reference.trim();
    if (!normalized) {
      throw new Error("CQRS reference name requires a non-empty string");
    }
    return normalized;
  }

  if (typeof reference?.name === "string" && reference.name.trim().length > 0) {
    return reference.name.trim();
  }

  throw new Error("CQRS reference requires a named class or non-empty string");
};

export const getCqrsLifecycleToken = (): string => CQRS_LIFECYCLE_TOKEN;
export const getCommandBusToken = (): string => COMMAND_BUS_TOKEN;
export const getQueryBusToken = (): string => QUERY_BUS_TOKEN;
export const getEventBusToken = (): string => EVENT_BUS_TOKEN;
export const getIdempotencyStoreToken = (): string => IDEMPOTENCY_STORE_TOKEN;
export const getReadDataSourceToken = (): string => READ_DATA_SOURCE_TOKEN;
export const getWriteDataSourceToken = (): string => WRITE_DATA_SOURCE_TOKEN;

export const getReadRepositoryToken = (entity: MessageReference): string => {
  return `${READ_REPOSITORY_TOKEN_PREFIX}:${resolveReferenceName(entity)}`;
};

export const getWriteRepositoryToken = (entity: MessageReference): string => {
  return `${WRITE_REPOSITORY_TOKEN_PREFIX}:${resolveReferenceName(entity)}`;
};

export const getCommandHandlerToken = (command: MessageReference): string => {
  return `${COMMAND_HANDLER_TOKEN_PREFIX}:${resolveReferenceName(command)}`;
};

export const getQueryHandlerToken = (query: MessageReference): string => {
  return `${QUERY_HANDLER_TOKEN_PREFIX}:${resolveReferenceName(query)}`;
};

export const getProjectionRebuilderToken = (name: string): string => {
  return `${PROJECTION_REBUILDER_TOKEN_PREFIX}:${resolveReferenceName(name)}`;
};