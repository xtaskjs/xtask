"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetCacheIntegration = exports.getCacheLifecycleManager = exports.shutdownCacheIntegration = exports.initializeCacheIntegration = exports.CacheLifecycleManager = void 0;
const configuration_1 = require("./configuration");
const cache_repository_1 = require("./cache.repository");
const admin_service_1 = require("./admin.service");
const cache_service_1 = require("./cache.service");
const http_cache_service_1 = require("./http-cache.service");
const tokens_1 = require("./tokens");
const stores_1 = require("./stores");
const shouldConnectStore = (defaultConnectOnStart, definition) => {
    return definition.redis?.connectOnStart ?? defaultConnectOnStart;
};
class CacheLifecycleManager {
    constructor() {
        this.repositories = new Map();
        this.stores = new Map();
        this.disconnectableStores = new Set();
        this.memoryStore = new stores_1.MemoryCacheStore();
        this.initialized = false;
        this.stoppingRegistered = false;
    }
    async initialize(container, lifecycle) {
        await this.destroy();
        this.container = container;
        this.lifecycle = lifecycle;
        this.initialized = true;
        for (const definition of (0, configuration_1.getRegisteredCacheModels)()) {
            await this.ensureRepository(definition.reference || definition.name);
        }
        this.registerContainerBindings(container);
        if (!this.stoppingRegistered && lifecycle && typeof lifecycle.on === "function") {
            lifecycle.on("stopping", async () => {
                await this.destroy();
            });
            this.stoppingRegistered = true;
        }
    }
    async destroy() {
        for (const store of Array.from(this.disconnectableStores.values())) {
            if (typeof store.disconnect === "function") {
                await store.disconnect();
            }
        }
        await this.memoryStore.clear();
        this.disconnectableStores.clear();
        this.repositories.clear();
        this.stores.clear();
        this.container = undefined;
        this.lifecycle = undefined;
        this.initialized = false;
        this.stoppingRegistered = false;
    }
    isInitialized(model) {
        if (!model) {
            return this.initialized;
        }
        return this.repositories.has(this.resolveModelDefinition(model).name);
    }
    getLifecycle() {
        return this.lifecycle;
    }
    listModels() {
        return Array.from(this.repositories.values())
            .map((repository) => repository.getSummary())
            .sort((left, right) => left.name.localeCompare(right.name));
    }
    getRepository(model) {
        const definition = this.resolveModelDefinition(model);
        const existingRepository = this.repositories.get(definition.name);
        if (existingRepository) {
            return existingRepository;
        }
        throw new Error(`Cache model '${definition.name}' is not initialized. Call initializeCacheIntegration() first.`);
    }
    async ensureRepository(model) {
        const definition = this.resolveModelDefinition(model);
        const existingRepository = this.repositories.get(definition.name);
        if (existingRepository) {
            return existingRepository;
        }
        const store = await this.resolveStore(definition);
        const repository = new cache_repository_1.CacheRepository(definition, store);
        this.repositories.set(definition.name, repository);
        if (this.container && typeof this.container.registerNamedInstance === "function") {
            this.container.registerNamedInstance((0, tokens_1.getCacheRepositoryToken)(definition.name), repository);
        }
        return repository;
    }
    resolveModelDefinition(model) {
        const definition = (0, configuration_1.getRegisteredCacheModel)(model);
        if (!definition) {
            throw new Error(`Cache model '${typeof model === "string" ? model : model.name}' is not registered`);
        }
        return definition;
    }
    async resolveStore(definition) {
        const existingStore = this.stores.get(definition.name);
        if (existingStore) {
            return existingStore;
        }
        let store;
        if (definition.store) {
            store = await this.resolveCustomStore(definition);
        }
        else if (definition.driver === "redis") {
            store = new stores_1.RedisCacheStore({
                ...((0, configuration_1.getCacheConfiguration)().redis || {}),
                ...(definition.redis || {}),
            });
            this.disconnectableStores.add(store);
        }
        else {
            store = this.memoryStore;
        }
        this.stores.set(definition.name, store);
        if (shouldConnectStore((0, configuration_1.getCacheConfiguration)().connectOnStart, definition) && typeof store.connect === "function") {
            await store.connect();
        }
        return store;
    }
    async resolveCustomStore(definition) {
        const configuredStore = definition.store;
        if (!configuredStore) {
            throw new Error(`Cache model '${definition.name}' does not define a custom store`);
        }
        const store = typeof configuredStore === "function"
            ? await configuredStore({
                model: definition,
                container: this.container,
                configuration: (0, configuration_1.getCacheConfiguration)(),
            })
            : configuredStore;
        if (typeof store.disconnect === "function") {
            this.disconnectableStores.add(store);
        }
        return store;
    }
    registerContainerBindings(container) {
        if (!container) {
            return;
        }
        const anyContainer = container;
        if (typeof anyContainer.registerNamedInstance === "function") {
            anyContainer.registerNamedInstance((0, tokens_1.getCacheLifecycleToken)(), this);
            anyContainer.registerNamedInstance((0, tokens_1.getCacheHttpServiceToken)(), (0, http_cache_service_1.getBaseHttpCacheService)());
            for (const [name, repository] of this.repositories.entries()) {
                anyContainer.registerNamedInstance((0, tokens_1.getCacheRepositoryToken)(name), repository);
            }
        }
        if (typeof anyContainer.registerWithName === "function") {
            anyContainer.registerWithName(cache_service_1.CacheService, { scope: "singleton" }, (0, tokens_1.getCacheServiceToken)());
            anyContainer.registerWithName(admin_service_1.CacheAdminService, { scope: "singleton" }, (0, tokens_1.getCacheAdminServiceToken)());
        }
    }
}
exports.CacheLifecycleManager = CacheLifecycleManager;
const lifecycleManager = new CacheLifecycleManager();
const initializeCacheIntegration = async (container, lifecycle) => {
    await lifecycleManager.initialize(container, lifecycle);
};
exports.initializeCacheIntegration = initializeCacheIntegration;
const shutdownCacheIntegration = async () => {
    await lifecycleManager.destroy();
};
exports.shutdownCacheIntegration = shutdownCacheIntegration;
const getCacheLifecycleManager = () => {
    return lifecycleManager;
};
exports.getCacheLifecycleManager = getCacheLifecycleManager;
const resetCacheIntegration = async () => {
    await (0, exports.shutdownCacheIntegration)();
    (0, configuration_1.resetCacheConfiguration)();
};
exports.resetCacheIntegration = resetCacheIntegration;
