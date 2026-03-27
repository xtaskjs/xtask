import "reflect-metadata";
import { getComponentMetadata, Service } from "@xtaskjs/core";
import { IdempotentCommandOptions, MessageReference } from "./types";

const COMMAND_HANDLER_KEY = Symbol("xtask:cqrs:command-handler");
const QUERY_HANDLER_KEY = Symbol("xtask:cqrs:query-handler");
const EVENT_HANDLER_KEY = Symbol("xtask:cqrs:event-handler");
const PROCESS_MANAGER_KEY = Symbol("xtask:cqrs:process-manager");
const PROJECTION_REBUILDER_KEY = Symbol("xtask:cqrs:projection-rebuilder");
const IDEMPOTENT_COMMAND_KEY = Symbol("xtask:cqrs:idempotent-command");

export interface CommandHandlerMetadata {
  command: MessageReference;
}

export interface QueryHandlerMetadata {
  query: MessageReference;
}

export interface EventHandlerMetadata {
  events: MessageReference[];
}

export interface ProcessManagerMetadata {
  events: MessageReference[];
}

export interface ProjectionRebuilderMetadata {
  name: string;
}

export interface IdempotentCommandMetadata extends IdempotentCommandOptions<any> {}

export const ensureServiceMetadata = (target: any): void => {
  if (!getComponentMetadata(target)) {
    Service()(target);
  }
};

export const defineCommandHandlerMetadata = (target: any, command: MessageReference): void => {
  ensureServiceMetadata(target);
  Reflect.defineMetadata(COMMAND_HANDLER_KEY, { command }, target);
};

export const defineQueryHandlerMetadata = (target: any, query: MessageReference): void => {
  ensureServiceMetadata(target);
  Reflect.defineMetadata(QUERY_HANDLER_KEY, { query }, target);
};

export const defineEventHandlerMetadata = (target: any, events: MessageReference[]): void => {
  ensureServiceMetadata(target);
  Reflect.defineMetadata(EVENT_HANDLER_KEY, { events }, target);
};

export const defineProcessManagerMetadata = (target: any, events: MessageReference[]): void => {
  ensureServiceMetadata(target);
  Reflect.defineMetadata(PROCESS_MANAGER_KEY, { events }, target);
};

export const defineProjectionRebuilderMetadata = (target: any, name: string): void => {
  ensureServiceMetadata(target);
  Reflect.defineMetadata(PROJECTION_REBUILDER_KEY, { name }, target);
};

export const defineIdempotentCommandMetadata = (
  target: any,
  options: IdempotentCommandOptions<any>
): void => {
  ensureServiceMetadata(target);
  Reflect.defineMetadata(IDEMPOTENT_COMMAND_KEY, { ...options }, target);
};

export const getCommandHandlerMetadata = (target: any): CommandHandlerMetadata | undefined => {
  return Reflect.getMetadata(COMMAND_HANDLER_KEY, target);
};

export const getQueryHandlerMetadata = (target: any): QueryHandlerMetadata | undefined => {
  return Reflect.getMetadata(QUERY_HANDLER_KEY, target);
};

export const getEventHandlerMetadata = (target: any): EventHandlerMetadata | undefined => {
  return Reflect.getMetadata(EVENT_HANDLER_KEY, target);
};

export const getProcessManagerMetadata = (target: any): ProcessManagerMetadata | undefined => {
  return Reflect.getMetadata(PROCESS_MANAGER_KEY, target);
};

export const getProjectionRebuilderMetadata = (target: any): ProjectionRebuilderMetadata | undefined => {
  return Reflect.getMetadata(PROJECTION_REBUILDER_KEY, target);
};

export const getIdempotentCommandMetadata = (target: any): IdempotentCommandMetadata | undefined => {
  return Reflect.getMetadata(IDEMPOTENT_COMMAND_KEY, target);
};

export const resolveMessageName = (reference: MessageReference | string): string => {
  if (typeof reference === "string") {
    const normalized = reference.trim();
    if (!normalized) {
      throw new Error("CQRS message name requires a non-empty string");
    }
    return normalized;
  }

  if (typeof reference?.name === "string" && reference.name.trim().length > 0) {
    return reference.name.trim();
  }

  throw new Error("CQRS message reference requires a named class or non-empty string");
};

export const resolvePayloadMessageName = (value: any): string => {
  if (typeof value === "string") {
    return resolveMessageName(value);
  }

  if (typeof value?.type === "string" && value.type.trim().length > 0) {
    return value.type.trim();
  }

  if (typeof value?.constructor?.name === "string" && value.constructor.name !== "Object") {
    return value.constructor.name;
  }

  throw new Error(
    "CQRS payload must be a named class instance or expose a non-empty string 'type' property"
  );
};