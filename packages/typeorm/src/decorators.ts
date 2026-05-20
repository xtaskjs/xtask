import { AutoWired, Qualifier } from "@xtaskjs/core";
import { registerTypeOrmMigration, registerTypeOrmSeeder } from "./configuration";
import { getDataSourceToken, getRepositoryToken } from "./tokens";

export const InjectDataSource = (name = "default"): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getDataSourceToken(name);
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const InjectRepository = (
  entity: Function | string,
  dataSourceName = "default"
): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getRepositoryToken(entity, dataSourceName);
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const TypeOrmMigration = (options: { dataSourceName?: string; name?: string } = {}): ClassDecorator => {
  return (target) => {
    registerTypeOrmMigration(target as any, options);
  };
};

export const TypeOrmSeeder = (
  options: { dataSourceName?: string; name?: string; order?: number } = {}
): ClassDecorator => {
  return (target) => {
    registerTypeOrmSeeder(target as any, options);
  };
};
