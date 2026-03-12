import { DataSourceOptions } from "typeorm";

export type XTaskTypeOrmDataSourceOptions = DataSourceOptions & {
  name?: string;
  initializeOnServerStart?: boolean;
};

const DEFAULT_DATA_SOURCE_NAME = "default";
const registeredDataSources = new Map<string, XTaskTypeOrmDataSourceOptions>();

const resolveDataSourceName = (options: XTaskTypeOrmDataSourceOptions): string => {
  if (typeof options.name === "string" && options.name.trim().length > 0) {
    return options.name;
  }
  return DEFAULT_DATA_SOURCE_NAME;
};

export const registerTypeOrmDataSource = (options: XTaskTypeOrmDataSourceOptions): void => {
  const name = resolveDataSourceName(options);
  registeredDataSources.set(name, { ...options, name });
};

export const getRegisteredTypeOrmDataSources = (): XTaskTypeOrmDataSourceOptions[] => {
  return Array.from(registeredDataSources.values());
};

export const clearRegisteredTypeOrmDataSources = (): void => {
  registeredDataSources.clear();
};

export const TypeOrmDataSource = (options: XTaskTypeOrmDataSourceOptions): ClassDecorator => {
  return () => {
    registerTypeOrmDataSource(options);
  };
};
