"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectWriteRepository = exports.InjectReadRepository = exports.InjectWriteDataSource = exports.InjectReadDataSource = exports.InjectCqrsLifecycleManager = exports.InjectIdempotencyStore = exports.InjectEventBus = exports.InjectQueryBus = exports.InjectCommandBus = exports.IdempotentCommand = exports.ProjectionRebuilder = exports.Saga = exports.ProcessManager = exports.EventHandler = exports.QueryHandler = exports.CommandHandler = void 0;
const core_1 = require("@xtaskjs/core");
const metadata_1 = require("./metadata");
const tokens_1 = require("./tokens");
const applyQualifier = (token) => {
    return (target, propertyKey, parameterIndex) => {
        if (typeof parameterIndex === "number") {
            (0, core_1.Qualifier)(token)(target, propertyKey, parameterIndex);
            return;
        }
        if (propertyKey !== undefined) {
            (0, core_1.AutoWired)({ qualifier: token })(target, propertyKey);
        }
    };
};
const CommandHandler = (command) => {
    return (target) => {
        (0, metadata_1.defineCommandHandlerMetadata)(target, command);
    };
};
exports.CommandHandler = CommandHandler;
const QueryHandler = (query) => {
    return (target) => {
        (0, metadata_1.defineQueryHandlerMetadata)(target, query);
    };
};
exports.QueryHandler = QueryHandler;
const EventHandler = (event) => {
    return (target) => {
        (0, metadata_1.defineEventHandlerMetadata)(target, Array.isArray(event) ? event : [event]);
    };
};
exports.EventHandler = EventHandler;
const ProcessManager = (event) => {
    return (target) => {
        (0, metadata_1.defineProcessManagerMetadata)(target, Array.isArray(event) ? event : [event]);
    };
};
exports.ProcessManager = ProcessManager;
exports.Saga = exports.ProcessManager;
const ProjectionRebuilder = (name) => {
    return (target) => {
        (0, metadata_1.defineProjectionRebuilderMetadata)(target, name);
    };
};
exports.ProjectionRebuilder = ProjectionRebuilder;
const IdempotentCommand = (options = {}) => {
    return (target) => {
        (0, metadata_1.defineIdempotentCommandMetadata)(target, options);
    };
};
exports.IdempotentCommand = IdempotentCommand;
const InjectCommandBus = () => {
    return applyQualifier((0, tokens_1.getCommandBusToken)());
};
exports.InjectCommandBus = InjectCommandBus;
const InjectQueryBus = () => {
    return applyQualifier((0, tokens_1.getQueryBusToken)());
};
exports.InjectQueryBus = InjectQueryBus;
const InjectEventBus = () => {
    return applyQualifier((0, tokens_1.getEventBusToken)());
};
exports.InjectEventBus = InjectEventBus;
const InjectIdempotencyStore = () => {
    return applyQualifier((0, tokens_1.getIdempotencyStoreToken)());
};
exports.InjectIdempotencyStore = InjectIdempotencyStore;
const InjectCqrsLifecycleManager = () => {
    return applyQualifier((0, tokens_1.getCqrsLifecycleToken)());
};
exports.InjectCqrsLifecycleManager = InjectCqrsLifecycleManager;
const InjectReadDataSource = () => {
    return applyQualifier((0, tokens_1.getReadDataSourceToken)());
};
exports.InjectReadDataSource = InjectReadDataSource;
const InjectWriteDataSource = () => {
    return applyQualifier((0, tokens_1.getWriteDataSourceToken)());
};
exports.InjectWriteDataSource = InjectWriteDataSource;
const InjectReadRepository = (entity) => {
    return applyQualifier((0, tokens_1.getReadRepositoryToken)(entity));
};
exports.InjectReadRepository = InjectReadRepository;
const InjectWriteRepository = (entity) => {
    return applyQualifier((0, tokens_1.getWriteRepositoryToken)(entity));
};
exports.InjectWriteRepository = InjectWriteRepository;
