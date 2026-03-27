"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectionRebuilderToken = exports.getQueryHandlerToken = exports.getCommandHandlerToken = exports.getWriteRepositoryToken = exports.getReadRepositoryToken = exports.getWriteDataSourceToken = exports.getReadDataSourceToken = exports.getIdempotencyStoreToken = exports.getEventBusToken = exports.getQueryBusToken = exports.getCommandBusToken = exports.getCqrsLifecycleToken = void 0;
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
const resolveReferenceName = (reference) => {
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
const getCqrsLifecycleToken = () => CQRS_LIFECYCLE_TOKEN;
exports.getCqrsLifecycleToken = getCqrsLifecycleToken;
const getCommandBusToken = () => COMMAND_BUS_TOKEN;
exports.getCommandBusToken = getCommandBusToken;
const getQueryBusToken = () => QUERY_BUS_TOKEN;
exports.getQueryBusToken = getQueryBusToken;
const getEventBusToken = () => EVENT_BUS_TOKEN;
exports.getEventBusToken = getEventBusToken;
const getIdempotencyStoreToken = () => IDEMPOTENCY_STORE_TOKEN;
exports.getIdempotencyStoreToken = getIdempotencyStoreToken;
const getReadDataSourceToken = () => READ_DATA_SOURCE_TOKEN;
exports.getReadDataSourceToken = getReadDataSourceToken;
const getWriteDataSourceToken = () => WRITE_DATA_SOURCE_TOKEN;
exports.getWriteDataSourceToken = getWriteDataSourceToken;
const getReadRepositoryToken = (entity) => {
    return `${READ_REPOSITORY_TOKEN_PREFIX}:${resolveReferenceName(entity)}`;
};
exports.getReadRepositoryToken = getReadRepositoryToken;
const getWriteRepositoryToken = (entity) => {
    return `${WRITE_REPOSITORY_TOKEN_PREFIX}:${resolveReferenceName(entity)}`;
};
exports.getWriteRepositoryToken = getWriteRepositoryToken;
const getCommandHandlerToken = (command) => {
    return `${COMMAND_HANDLER_TOKEN_PREFIX}:${resolveReferenceName(command)}`;
};
exports.getCommandHandlerToken = getCommandHandlerToken;
const getQueryHandlerToken = (query) => {
    return `${QUERY_HANDLER_TOKEN_PREFIX}:${resolveReferenceName(query)}`;
};
exports.getQueryHandlerToken = getQueryHandlerToken;
const getProjectionRebuilderToken = (name) => {
    return `${PROJECTION_REBUILDER_TOKEN_PREFIX}:${resolveReferenceName(name)}`;
};
exports.getProjectionRebuilderToken = getProjectionRebuilderToken;
