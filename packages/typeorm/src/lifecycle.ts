import { Container } from "@xtaskjs/core";
import { DataSource, ObjectLiteral, ObjectType, Repository } from "typeorm";
import {
  getRegisteredTypeOrmDataSources,
  getRegisteredTypeOrmMigrations,
  getRegisteredTypeOrmSeeders,
  TypeOrmSeederLike,
  TypeOrmSeederClass,
} from "./configuration";
import { getDataSourceToken, getRepositoryToken } from "./tokens";

const DEFAULT_DATA_SOURCE_NAME = "default";

export class TypeOrmLifecycleManager {
  private readonly dataSources = new Map<string, DataSource>();

  private mergeUnique<T>(left: T[] = [], right: T[] = []): T[] {
    return Array.from(new Set([...left, ...right]));
  }

  private resolveSeederInstance(container: Container | undefined, seeder: TypeOrmSeederClass): TypeOrmSeederLike {
    if (container && typeof (container as any).get === "function") {
      try {
        return (container as any).get(seeder);
      } catch {
        // Fallback to direct construction when the seeder is not registered in DI.
      }
    }

    return new seeder();
  }

  private async runSeeders(
    dataSourceName: string,
    dataSource: DataSource,
    container?: Container,
    seeders: TypeOrmSeederClass[] = []
  ): Promise<void> {
    const registeredSeeders = this.mergeUnique(
      seeders,
      getRegisteredTypeOrmSeeders(dataSourceName).map((definition) => definition.target)
    );

    if (registeredSeeders.length === 0) {
      return;
    }

    for (const seederClass of registeredSeeders) {
      const definition = getRegisteredTypeOrmSeeders(dataSourceName).find((candidate) => candidate.target === seederClass);
      const seeder = this.resolveSeederInstance(container, seederClass);
      if (typeof seeder?.run !== "function") {
        throw new Error(`TypeORM seeder '${definition?.name || seederClass.name || "anonymous"}' must define run(dataSource)`);
      }

      await seeder.run(dataSource);
    }
  }

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

      const migrations = this.mergeUnique(
        Array.isArray(definition.migrations) ? definition.migrations : [],
        getRegisteredTypeOrmMigrations(name).map((migration) => migration.target)
      );
      const seeders = Array.isArray(definition.seeders) ? definition.seeders : [];
      const dataSource = new DataSource({
        ...definition,
        migrations,
      } as any);

      try {
        await dataSource.initialize();
        this.dataSources.set(name, dataSource);
        this.registerNamedInstances(name, dataSource, container);

        if (definition.runMigrationsOnServerStart === true) {
          await dataSource.runMigrations();
        }

        if (definition.runSeedersOnServerStart === true) {
          await this.runSeeders(name, dataSource, container, seeders);
        }
      } catch (error) {
        if (dataSource.isInitialized) {
          await dataSource.destroy();
        }
        this.dataSources.delete(name);
        throw error;
      }
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
