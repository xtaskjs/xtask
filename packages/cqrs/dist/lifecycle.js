"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetCqrsIntegration = exports.getCqrsLifecycleManager = exports.shutdownCqrsIntegration = exports.initializeCqrsIntegration = exports.CqrsLifecycleManager = void 0;
const typeorm_1 = require("@xtaskjs/typeorm");
const bus_1 = require("./bus");
const configuration_1 = require("./configuration");
const idempotency_1 = require("./idempotency");
const metadata_1 = require("./metadata");
const tokens_1 = require("./tokens");
const assertHandlerMethod = (handler, method, messageType) => {
    if (typeof handler?.[method] !== "function") {
        throw new Error(`CQRS ${messageType} handler '${handler?.constructor?.name || "anonymous"}' must define ${method}()`);
    }
};
class CqrsLifecycleManager {
    constructor() {
        this.stoppingRegistered = false;
        this.initialized = false;
        this.idempotencyStore = new idempotency_1.MemoryIdempotencyStore();
        this.commandHandlers = new Map();
        this.queryHandlers = new Map();
        this.eventHandlers = new Map();
        this.processManagers = new Map();
        this.projectionRebuilders = new Map();
        this.idempotentCommands = new Map();
        this.inFlightIdempotentCommands = new Map();
        this.commandBus = new bus_1.CommandBus((command) => this.executeCommand(command));
        this.queryBus = new bus_1.QueryBus((query) => this.executeQuery(query));
        this.eventBus = new bus_1.EventBus((event) => this.publishEvent(event));
    }
    async initialize(container, lifecycle) {
        await this.destroy();
        this.container = container;
        this.lifecycle = lifecycle;
        this.idempotencyStore = (0, configuration_1.getCqrsConfiguration)().idempotencyStore || new idempotency_1.MemoryIdempotencyStore();
        this.registerCoreContainerBindings(container);
        this.registerHandlers(container);
        this.registerHandlerContainerBindings(container);
        this.initialized = true;
        if (!this.stoppingRegistered && lifecycle && typeof lifecycle.on === "function") {
            lifecycle.on("stopping", async () => {
                await this.destroy();
            });
            this.stoppingRegistered = true;
        }
    }
    async destroy() {
        this.commandHandlers.clear();
        this.queryHandlers.clear();
        this.eventHandlers.clear();
        this.processManagers.clear();
        this.projectionRebuilders.clear();
        this.idempotentCommands.clear();
        this.inFlightIdempotentCommands.clear();
        if (typeof this.idempotencyStore.clear === "function") {
            await this.idempotencyStore.clear();
        }
        this.idempotencyStore = new idempotency_1.MemoryIdempotencyStore();
        this.container = undefined;
        this.lifecycle = undefined;
        this.initialized = false;
        this.stoppingRegistered = false;
    }
    isInitialized() {
        return this.initialized;
    }
    getContainer() {
        return this.container;
    }
    getLifecycle() {
        return this.lifecycle;
    }
    getCommandBus() {
        return this.commandBus;
    }
    getQueryBus() {
        return this.queryBus;
    }
    getEventBus() {
        return this.eventBus;
    }
    getIdempotencyStore() {
        return this.idempotencyStore;
    }
    getReadDataSource() {
        const configuration = (0, configuration_1.getCqrsConfiguration)();
        return this.getConfiguredDataSource(configuration.readDataSourceName, "read");
    }
    getWriteDataSource() {
        const configuration = (0, configuration_1.getCqrsConfiguration)();
        return this.getConfiguredDataSource(configuration.writeDataSourceName, "write");
    }
    getReadRepository(entity) {
        return this.getReadDataSource().getRepository(entity);
    }
    getWriteRepository(entity) {
        return this.getWriteDataSource().getRepository(entity);
    }
    listProjectionRebuilders() {
        return Array.from(this.projectionRebuilders.keys()).sort();
    }
    async rebuildProjection(name) {
        const normalizedName = name.trim();
        const rebuilder = this.projectionRebuilders.get(normalizedName);
        if (!rebuilder) {
            throw new Error(`No CQRS projection rebuilder registered for '${normalizedName}'`);
        }
        await rebuilder.rebuild({
            name: normalizedName,
            container: this.container,
            lifecycle: this,
        });
    }
    async rebuildAllProjections() {
        const names = this.listProjectionRebuilders();
        for (const name of names) {
            await this.rebuildProjection(name);
        }
        return names;
    }
    async executeCommand(command) {
        const messageName = (0, metadata_1.resolvePayloadMessageName)(command);
        const handler = this.commandHandlers.get(messageName);
        if (!handler) {
            throw new Error(`No CQRS command handler registered for '${messageName}'`);
        }
        const idempotencyMetadata = this.idempotentCommands.get(messageName);
        if (!idempotencyMetadata) {
            return handler.execute(command);
        }
        const idempotencyKey = this.resolveIdempotencyKey(messageName, command, idempotencyMetadata);
        const inFlight = this.inFlightIdempotentCommands.get(idempotencyKey);
        if (inFlight) {
            return inFlight;
        }
        const cached = await Promise.resolve(this.idempotencyStore.get(idempotencyKey));
        if (cached !== undefined) {
            return cached;
        }
        const execution = Promise.resolve(handler.execute(command))
            .then(async (result) => {
            await Promise.resolve(this.idempotencyStore.set(idempotencyKey, result, idempotencyMetadata.ttlMs));
            return result;
        })
            .finally(() => {
            this.inFlightIdempotentCommands.delete(idempotencyKey);
        });
        this.inFlightIdempotentCommands.set(idempotencyKey, execution);
        return execution;
    }
    async executeQuery(query) {
        const key = (0, metadata_1.resolvePayloadMessageName)(query);
        const handler = this.queryHandlers.get(key);
        if (!handler) {
            throw new Error(`No CQRS query handler registered for '${key}'`);
        }
        return handler.execute(query);
    }
    async publishEvent(event) {
        const key = (0, metadata_1.resolvePayloadMessageName)(event);
        const handlers = this.eventHandlers.get(key) || [];
        const processManagers = this.processManagers.get(key) || [];
        for (const handler of handlers) {
            await handler.handle(event);
        }
        if (processManagers.length === 0) {
            return;
        }
        const context = {
            commandBus: this.commandBus,
            queryBus: this.queryBus,
            eventBus: this.eventBus,
            container: this.container,
            lifecycle: this,
        };
        for (const processManager of processManagers) {
            await processManager.handle(event, context);
        }
    }
    registerHandlers(container) {
        if (!container) {
            return;
        }
        for (const type of container.getRegisteredTypes()) {
            const commandMetadata = (0, metadata_1.getCommandHandlerMetadata)(type);
            const queryMetadata = (0, metadata_1.getQueryHandlerMetadata)(type);
            const eventMetadata = (0, metadata_1.getEventHandlerMetadata)(type);
            const processManagerMetadata = (0, metadata_1.getProcessManagerMetadata)(type);
            const projectionRebuilderMetadata = (0, metadata_1.getProjectionRebuilderMetadata)(type);
            if (!commandMetadata && !queryMetadata && !eventMetadata && !processManagerMetadata && !projectionRebuilderMetadata) {
                continue;
            }
            const instance = container.get(type);
            if (commandMetadata) {
                const key = (0, metadata_1.resolveMessageName)(commandMetadata.command);
                if (this.commandHandlers.has(key)) {
                    throw new Error(`Multiple CQRS command handlers registered for '${key}'`);
                }
                assertHandlerMethod(instance, "execute", "command");
                this.commandHandlers.set(key, instance);
                const idempotencyMetadata = (0, metadata_1.getIdempotentCommandMetadata)(type);
                if (idempotencyMetadata) {
                    this.idempotentCommands.set(key, idempotencyMetadata);
                }
            }
            if (queryMetadata) {
                const key = (0, metadata_1.resolveMessageName)(queryMetadata.query);
                if (this.queryHandlers.has(key)) {
                    throw new Error(`Multiple CQRS query handlers registered for '${key}'`);
                }
                assertHandlerMethod(instance, "execute", "query");
                this.queryHandlers.set(key, instance);
            }
            if (eventMetadata) {
                assertHandlerMethod(instance, "handle", "event");
                for (const event of eventMetadata.events) {
                    const key = (0, metadata_1.resolveMessageName)(event);
                    const handlers = this.eventHandlers.get(key) || [];
                    handlers.push(instance);
                    this.eventHandlers.set(key, handlers);
                }
            }
            if (processManagerMetadata) {
                assertHandlerMethod(instance, "handle", "process manager");
                for (const event of processManagerMetadata.events) {
                    const key = (0, metadata_1.resolveMessageName)(event);
                    const managers = this.processManagers.get(key) || [];
                    managers.push(instance);
                    this.processManagers.set(key, managers);
                }
            }
            if (projectionRebuilderMetadata) {
                if (typeof instance.rebuild !== "function") {
                    throw new Error(`CQRS projection rebuilder '${type.name || "anonymous"}' must define rebuild()`);
                }
                if (this.projectionRebuilders.has(projectionRebuilderMetadata.name)) {
                    throw new Error(`Multiple CQRS projection rebuilders registered for '${projectionRebuilderMetadata.name}'`);
                }
                this.projectionRebuilders.set(projectionRebuilderMetadata.name, instance);
            }
        }
    }
    registerCoreContainerBindings(container) {
        if (!container) {
            return;
        }
        const anyContainer = container;
        if (typeof anyContainer.registerNamedInstance !== "function") {
            return;
        }
        anyContainer.registerNamedInstance((0, tokens_1.getCqrsLifecycleToken)(), this);
        anyContainer.registerNamedInstance((0, tokens_1.getCommandBusToken)(), this.commandBus);
        anyContainer.registerNamedInstance((0, tokens_1.getQueryBusToken)(), this.queryBus);
        anyContainer.registerNamedInstance((0, tokens_1.getEventBusToken)(), this.eventBus);
        anyContainer.registerNamedInstance((0, tokens_1.getIdempotencyStoreToken)(), this.idempotencyStore);
        const readDataSource = this.getReadDataSource();
        const writeDataSource = this.getWriteDataSource();
        anyContainer.registerNamedInstance((0, tokens_1.getReadDataSourceToken)(), readDataSource);
        anyContainer.registerNamedInstance((0, tokens_1.getWriteDataSourceToken)(), writeDataSource);
        this.registerRepositoryAliases("read", readDataSource, anyContainer);
        this.registerRepositoryAliases("write", writeDataSource, anyContainer);
    }
    registerHandlerContainerBindings(container) {
        if (!container) {
            return;
        }
        const anyContainer = container;
        if (typeof anyContainer.registerNamedInstance !== "function") {
            return;
        }
        for (const registration of this.commandHandlers.entries()) {
            anyContainer.registerNamedInstance((0, tokens_1.getCommandHandlerToken)(registration[0]), registration[1]);
        }
        for (const registration of this.queryHandlers.entries()) {
            anyContainer.registerNamedInstance((0, tokens_1.getQueryHandlerToken)(registration[0]), registration[1]);
        }
        for (const registration of this.projectionRebuilders.entries()) {
            anyContainer.registerNamedInstance((0, tokens_1.getProjectionRebuilderToken)(registration[0]), registration[1]);
        }
    }
    resolveIdempotencyKey(messageName, command, metadata) {
        const explicitKey = metadata.key?.(command);
        if (typeof explicitKey === "string" && explicitKey.trim().length > 0) {
            return `${messageName}:${explicitKey.trim()}`;
        }
        if (typeof command?.idempotencyKey === "string" && command.idempotencyKey.trim().length > 0) {
            return `${messageName}:${command.idempotencyKey.trim()}`;
        }
        if (typeof command?.id === "string" && command.id.trim().length > 0) {
            return `${messageName}:${command.id.trim()}`;
        }
        return `${messageName}:${JSON.stringify(command)}`;
    }
    registerRepositoryAliases(side, dataSource, container) {
        for (const metadata of dataSource.entityMetadatas) {
            const entityTarget = metadata.target;
            if (typeof entityTarget !== "function" && typeof entityTarget !== "string") {
                continue;
            }
            const repository = dataSource.getRepository(entityTarget);
            const token = side === "read"
                ? (0, tokens_1.getReadRepositoryToken)(entityTarget)
                : (0, tokens_1.getWriteRepositoryToken)(entityTarget);
            container.registerNamedInstance(token, repository);
        }
    }
    getConfiguredDataSource(name, side) {
        try {
            return (0, typeorm_1.getTypeOrmLifecycleManager)().getDataSource(name);
        }
        catch (error) {
            throw new Error(`CQRS ${side} datasource '${name}' is not initialized. Register it with @xtaskjs/typeorm and ensure initializeTypeOrmIntegration() runs before initializeCqrsIntegration().`);
        }
    }
}
exports.CqrsLifecycleManager = CqrsLifecycleManager;
const lifecycleManager = new CqrsLifecycleManager();
const initializeCqrsIntegration = async (container, lifecycle) => {
    await lifecycleManager.initialize(container, lifecycle);
};
exports.initializeCqrsIntegration = initializeCqrsIntegration;
const shutdownCqrsIntegration = async () => {
    await lifecycleManager.destroy();
};
exports.shutdownCqrsIntegration = shutdownCqrsIntegration;
const getCqrsLifecycleManager = () => {
    return lifecycleManager;
};
exports.getCqrsLifecycleManager = getCqrsLifecycleManager;
const resetCqrsIntegration = async () => {
    await (0, exports.shutdownCqrsIntegration)();
    (0, configuration_1.resetCqrsConfiguration)();
};
exports.resetCqrsIntegration = resetCqrsIntegration;
