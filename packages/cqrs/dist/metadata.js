"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePayloadMessageName = exports.resolveMessageName = exports.getIdempotentCommandMetadata = exports.getProjectionRebuilderMetadata = exports.getProcessManagerMetadata = exports.getEventHandlerMetadata = exports.getQueryHandlerMetadata = exports.getCommandHandlerMetadata = exports.defineIdempotentCommandMetadata = exports.defineProjectionRebuilderMetadata = exports.defineProcessManagerMetadata = exports.defineEventHandlerMetadata = exports.defineQueryHandlerMetadata = exports.defineCommandHandlerMetadata = exports.ensureServiceMetadata = void 0;
require("reflect-metadata");
const core_1 = require("@xtaskjs/core");
const COMMAND_HANDLER_KEY = Symbol("xtask:cqrs:command-handler");
const QUERY_HANDLER_KEY = Symbol("xtask:cqrs:query-handler");
const EVENT_HANDLER_KEY = Symbol("xtask:cqrs:event-handler");
const PROCESS_MANAGER_KEY = Symbol("xtask:cqrs:process-manager");
const PROJECTION_REBUILDER_KEY = Symbol("xtask:cqrs:projection-rebuilder");
const IDEMPOTENT_COMMAND_KEY = Symbol("xtask:cqrs:idempotent-command");
const ensureServiceMetadata = (target) => {
    if (!(0, core_1.getComponentMetadata)(target)) {
        (0, core_1.Service)()(target);
    }
};
exports.ensureServiceMetadata = ensureServiceMetadata;
const defineCommandHandlerMetadata = (target, command) => {
    (0, exports.ensureServiceMetadata)(target);
    Reflect.defineMetadata(COMMAND_HANDLER_KEY, { command }, target);
};
exports.defineCommandHandlerMetadata = defineCommandHandlerMetadata;
const defineQueryHandlerMetadata = (target, query) => {
    (0, exports.ensureServiceMetadata)(target);
    Reflect.defineMetadata(QUERY_HANDLER_KEY, { query }, target);
};
exports.defineQueryHandlerMetadata = defineQueryHandlerMetadata;
const defineEventHandlerMetadata = (target, events) => {
    (0, exports.ensureServiceMetadata)(target);
    Reflect.defineMetadata(EVENT_HANDLER_KEY, { events }, target);
};
exports.defineEventHandlerMetadata = defineEventHandlerMetadata;
const defineProcessManagerMetadata = (target, events) => {
    (0, exports.ensureServiceMetadata)(target);
    Reflect.defineMetadata(PROCESS_MANAGER_KEY, { events }, target);
};
exports.defineProcessManagerMetadata = defineProcessManagerMetadata;
const defineProjectionRebuilderMetadata = (target, name) => {
    (0, exports.ensureServiceMetadata)(target);
    Reflect.defineMetadata(PROJECTION_REBUILDER_KEY, { name }, target);
};
exports.defineProjectionRebuilderMetadata = defineProjectionRebuilderMetadata;
const defineIdempotentCommandMetadata = (target, options) => {
    (0, exports.ensureServiceMetadata)(target);
    Reflect.defineMetadata(IDEMPOTENT_COMMAND_KEY, { ...options }, target);
};
exports.defineIdempotentCommandMetadata = defineIdempotentCommandMetadata;
const getCommandHandlerMetadata = (target) => {
    return Reflect.getMetadata(COMMAND_HANDLER_KEY, target);
};
exports.getCommandHandlerMetadata = getCommandHandlerMetadata;
const getQueryHandlerMetadata = (target) => {
    return Reflect.getMetadata(QUERY_HANDLER_KEY, target);
};
exports.getQueryHandlerMetadata = getQueryHandlerMetadata;
const getEventHandlerMetadata = (target) => {
    return Reflect.getMetadata(EVENT_HANDLER_KEY, target);
};
exports.getEventHandlerMetadata = getEventHandlerMetadata;
const getProcessManagerMetadata = (target) => {
    return Reflect.getMetadata(PROCESS_MANAGER_KEY, target);
};
exports.getProcessManagerMetadata = getProcessManagerMetadata;
const getProjectionRebuilderMetadata = (target) => {
    return Reflect.getMetadata(PROJECTION_REBUILDER_KEY, target);
};
exports.getProjectionRebuilderMetadata = getProjectionRebuilderMetadata;
const getIdempotentCommandMetadata = (target) => {
    return Reflect.getMetadata(IDEMPOTENT_COMMAND_KEY, target);
};
exports.getIdempotentCommandMetadata = getIdempotentCommandMetadata;
const resolveMessageName = (reference) => {
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
exports.resolveMessageName = resolveMessageName;
const resolvePayloadMessageName = (value) => {
    if (typeof value === "string") {
        return (0, exports.resolveMessageName)(value);
    }
    if (typeof value?.type === "string" && value.type.trim().length > 0) {
        return value.type.trim();
    }
    if (typeof value?.constructor?.name === "string" && value.constructor.name !== "Object") {
        return value.constructor.name;
    }
    throw new Error("CQRS payload must be a named class instance or expose a non-empty string 'type' property");
};
exports.resolvePayloadMessageName = resolvePayloadMessageName;
