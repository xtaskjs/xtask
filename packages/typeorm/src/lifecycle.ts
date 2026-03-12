import { Container } from "@xtaskjs/core";
import { DataSource, ObjectLiteral, ObjectType, Repository } from "typeorm";
import { getRegisteredTypeOrmDataSources } from "./configuration";
import { getDataSourceToken, getRepositoryToken } from "./tokens";

const DEFAULT_DATA_SOURCE_NAME = "default";

export class TypeOrmLifecycleManager {
  private readonly dataSources = new Map<string, DataSource>();

  async initialize(container?: Container): Promise<void> {
    const dataSourceDefinitions = getRegisteredTypeOrmDataSources();

    for (const definition of dataSourceDefinitions) {
      if (definition.initializeOnServerStart === false) {
        continue;
      }

      const name = definition.name || DEFAULT_DATA_SOURCE_NAME;
      if (this.dataSources.has(name)) {
        continue;
      }

      const dataSource = new DataSource(definition);
      await dataSource.initialize();
      this.dataSources.set(name, dataSource);
      this.registerNamedInstances(name, dataSource, container);
    }
  }

  async destroy(): Promise<void> {
    for (const [name, dataSource] of this.dataSources.entries()) {
      if (!dataSource.isInitialized) {
        this.dataSources.delete(name);
        continue;
      }

      await dataSource.destroy();
      this.dataSources.delete(name);
    }
  }

  getDataSource(name = DEFAULT_DATA_SOURCE_NAME): DataSource {
    const dataSource = this.dataSources.get(name);
    if (!dataSource) {
      throw new Error(`TypeORM datasource '${name}' is not initialized`);
    }
    return dataSource;
  }

  getRepository<T extends ObjectLiteral>(
    entity: ObjectType<T>,
    dataSourceName = DEFAULT_DATA_SOURCE_NAME
  ): Repository<T> {
    return this.getDataSource(dataSourceName).getRepository(entity);
  }

  isInitialized(name = DEFAULT_DATA_SOURCE_NAME): boolean {
    return this.dataSources.get(name)?.isInitialized === true;
  }

  private registerNamedInstances(dataSourceName: string, dataSource: DataSource, container?: Container): void {
    if (!container) {
      return;
    }

    container.registerNamedInstance(getDataSourceToken(dataSourceName), dataSource);

    for (const metadata of dataSource.entityMetadatas) {
      const entityTarget = metadata.target;
      if (typeof entityTarget !== "function" && typeof entityTarget !== "string") {
        continue;
      }

      const repository = dataSource.getRepository(entityTarget as any);
      const token = getRepositoryToken(entityTarget as Function | string, dataSourceName);
      container.registerNamedInstance(token, repository);
    }
  }
}

const lifecycleManager = new TypeOrmLifecycleManager();

export const initializeTypeOrmIntegration = async (container?: Container): Promise<void> => {
  await lifecycleManager.initialize(container);
};

export const shutdownTypeOrmIntegration = async (): Promise<void> => {
  await lifecycleManager.destroy();
};

export const getTypeOrmLifecycleManager = (): TypeOrmLifecycleManager => {
  return lifecycleManager;
};
