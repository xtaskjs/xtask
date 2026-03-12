"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTypeOrmLifecycleManager = exports.shutdownTypeOrmIntegration = exports.initializeTypeOrmIntegration = exports.TypeOrmLifecycleManager = void 0;
const typeorm_1 = require("typeorm");
const configuration_1 = require("./configuration");
const tokens_1 = require("./tokens");
const DEFAULT_DATA_SOURCE_NAME = "default";
class TypeOrmLifecycleManager {
    constructor() {
        this.dataSources = new Map();
    }
    async initialize(container) {
        const dataSourceDefinitions = (0, configuration_1.getRegisteredTypeOrmDataSources)();
        for (const definition of dataSourceDefinitions) {
            if (definition.initializeOnServerStart === false) {
                continue;
            }
            const name = definition.name || DEFAULT_DATA_SOURCE_NAME;
            if (this.dataSources.has(name)) {
                continue;
            }
            const dataSource = new typeorm_1.DataSource(definition);
            await dataSource.initialize();
            this.dataSources.set(name, dataSource);
            this.registerNamedInstances(name, dataSource, container);
        }
    }
    async destroy() {
        for (const [name, dataSource] of this.dataSources.entries()) {
            if (!dataSource.isInitialized) {
                this.dataSources.delete(name);
                continue;
            }
            await dataSource.destroy();
            this.dataSources.delete(name);
        }
    }
    getDataSource(name = DEFAULT_DATA_SOURCE_NAME) {
        const dataSource = this.dataSources.get(name);
        if (!dataSource) {
            throw new Error(`TypeORM datasource '${name}' is not initialized`);
        }
        return dataSource;
    }
    getRepository(entity, dataSourceName = DEFAULT_DATA_SOURCE_NAME) {
        return this.getDataSource(dataSourceName).getRepository(entity);
    }
    isInitialized(name = DEFAULT_DATA_SOURCE_NAME) {
        return this.dataSources.get(name)?.isInitialized === true;
    }
    registerNamedInstances(dataSourceName, dataSource, container) {
        if (!container) {
            return;
        }
        container.registerNamedInstance((0, tokens_1.getDataSourceToken)(dataSourceName), dataSource);
        for (const metadata of dataSource.entityMetadatas) {
            const entityTarget = metadata.target;
            if (typeof entityTarget !== "function" && typeof entityTarget !== "string") {
                continue;
            }
            const repository = dataSource.getRepository(entityTarget);
            const token = (0, tokens_1.getRepositoryToken)(entityTarget, dataSourceName);
            container.registerNamedInstance(token, repository);
        }
    }
}
exports.TypeOrmLifecycleManager = TypeOrmLifecycleManager;
const lifecycleManager = new TypeOrmLifecycleManager();
const initializeTypeOrmIntegration = async (container) => {
    await lifecycleManager.initialize(container);
};
exports.initializeTypeOrmIntegration = initializeTypeOrmIntegration;
const shutdownTypeOrmIntegration = async () => {
    await lifecycleManager.destroy();
};
exports.shutdownTypeOrmIntegration = shutdownTypeOrmIntegration;
const getTypeOrmLifecycleManager = () => {
    return lifecycleManager;
};
exports.getTypeOrmLifecycleManager = getTypeOrmLifecycleManager;
