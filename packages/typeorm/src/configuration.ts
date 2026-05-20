import { DataSource, DataSourceOptions, MigrationInterface } from "typeorm";

export interface TypeOrmSeederLike {
  run(dataSource: DataSource): Promise<void> | void;
}

export type TypeOrmSeederClass = new (...args: any[]) => TypeOrmSeederLike;

export interface TypeOrmSeederRegistrationOptions {
  dataSourceName?: string;
  name?: string;
  order?: number;
}

export interface RegisteredTypeOrmSeeder extends TypeOrmSeederRegistrationOptions {
  dataSourceName: string;
  name: string;
  order: number;
  target: TypeOrmSeederClass;
}

export interface TypeOrmMigrationRegistrationOptions {
  dataSourceName?: string;
  name?: string;
}

export interface RegisteredTypeOrmMigration extends TypeOrmMigrationRegistrationOptions {
  dataSourceName: string;
  name: string;
  target: new (...args: any[]) => MigrationInterface;
}

export type XTaskTypeOrmDataSourceOptions = DataSourceOptions & {
  name?: string;
  initializeOnServerStart?: boolean;
  runMigrationsOnServerStart?: boolean;
  runSeedersOnServerStart?: boolean;
  seeders?: TypeOrmSeederClass[];
};

const DEFAULT_DATA_SOURCE_NAME = "default";
const registeredDataSources = new Map<string, XTaskTypeOrmDataSourceOptions>();
const registeredMigrations = new Map<string, Map<string, RegisteredTypeOrmMigration>>();
const registeredSeeders = new Map<string, Map<string, RegisteredTypeOrmSeeder>>();

const resolveDataSourceName = (options: XTaskTypeOrmDataSourceOptions): string => {
  if (typeof options.name === "string" && options.name.trim().length > 0) {
    return options.name;
  }
  return DEFAULT_DATA_SOURCE_NAME;
};

const normalizeRegistryName = (value?: string): string => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return "anonymous";
};

const getOrCreateNamedRegistry = <T>(
  registry: Map<string, Map<string, T>>,
  dataSourceName: string
): Map<string, T> => {
  const existingRegistry = registry.get(dataSourceName);
  if (existingRegistry) {
    return existingRegistry;
  }

  const namedRegistry = new Map<string, T>();
  registry.set(dataSourceName, namedRegistry);
  return namedRegistry;
};

export const registerTypeOrmDataSource = (options: XTaskTypeOrmDataSourceOptions): void => {
  const name = resolveDataSourceName(options);
  registeredDataSources.set(name, {
    ...options,
    name,
    seeders: options.seeders ? [...options.seeders] : undefined,
    migrations: Array.isArray(options.migrations) ? [...options.migrations] : options.migrations,
  });
};

export const getRegisteredTypeOrmDataSources = (): XTaskTypeOrmDataSourceOptions[] => {
  return Array.from(registeredDataSources.values()).map((definition) => ({
    ...definition,
    seeders: definition.seeders ? [...definition.seeders] : undefined,
    migrations: Array.isArray(definition.migrations) ? [...definition.migrations] : definition.migrations,
  }));
};

export const clearRegisteredTypeOrmDataSources = (): void => {
  registeredDataSources.clear();
};

export const registerTypeOrmMigration = (
  target: new (...args: any[]) => MigrationInterface,
  options: TypeOrmMigrationRegistrationOptions = {}
): RegisteredTypeOrmMigration => {
  const dataSourceName = normalizeRegistryName(options.dataSourceName || DEFAULT_DATA_SOURCE_NAME);
  const name = normalizeRegistryName(options.name || target.name);
  const definition: RegisteredTypeOrmMigration = {
    dataSourceName,
    name,
    target,
  };

  getOrCreateNamedRegistry(registeredMigrations, dataSourceName).set(name, definition);
  return { ...definition };
};

export const getRegisteredTypeOrmMigrations = (dataSourceName?: string): RegisteredTypeOrmMigration[] => {
  if (typeof dataSourceName === "string" && dataSourceName.trim().length > 0) {
    return Array.from(registeredMigrations.get(dataSourceName.trim())?.values() || []).map((definition) => ({
      ...definition,
    }));
  }

  return Array.from(registeredMigrations.values())
    .flatMap((entries) => Array.from(entries.values()))
    .map((definition) => ({ ...definition }));
};

export const clearRegisteredTypeOrmMigrations = (dataSourceName?: string): void => {
  if (typeof dataSourceName === "string" && dataSourceName.trim().length > 0) {
    registeredMigrations.delete(dataSourceName.trim());
    return;
  }

  registeredMigrations.clear();
};

export const registerTypeOrmSeeder = (
  target: TypeOrmSeederClass,
  options: TypeOrmSeederRegistrationOptions = {}
): RegisteredTypeOrmSeeder => {
  const dataSourceName = normalizeRegistryName(options.dataSourceName || DEFAULT_DATA_SOURCE_NAME);
  const name = normalizeRegistryName(options.name || target.name);
  const definition: RegisteredTypeOrmSeeder = {
    dataSourceName,
    name,
    order: Number.isFinite(options.order as number) ? Number(options.order) : 0,
    target,
  };

  getOrCreateNamedRegistry(registeredSeeders, dataSourceName).set(name, definition);
  return { ...definition };
};

export const getRegisteredTypeOrmSeeders = (dataSourceName?: string): RegisteredTypeOrmSeeder[] => {
  const seeders =
    typeof dataSourceName === "string" && dataSourceName.trim().length > 0
      ? Array.from(registeredSeeders.get(dataSourceName.trim())?.values() || [])
      : Array.from(registeredSeeders.values()).flatMap((entries) => Array.from(entries.values()));

  return seeders
    .map((definition) => ({ ...definition }))
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
};

export const clearRegisteredTypeOrmSeeders = (dataSourceName?: string): void => {
  if (typeof dataSourceName === "string" && dataSourceName.trim().length > 0) {
    registeredSeeders.delete(dataSourceName.trim());
    return;
  }

  registeredSeeders.clear();
};

export const TypeOrmDataSource = (options: XTaskTypeOrmDataSourceOptions): ClassDecorator => {
  return () => {
    registerTypeOrmDataSource(options);
  };
};
