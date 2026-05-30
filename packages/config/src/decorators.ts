import { AutoWired, Qualifier } from "@xtaskjs/core";
import { configureConfig } from "./configuration";
import { getConfigLifecycleToken, getConfigServiceToken } from "./tokens";
import type { ConfigModuleOptions } from "./types";

export const ConfigSettings = <TSchema extends import("zod").ZodTypeAny>(
  options: ConfigModuleOptions<TSchema>
): ClassDecorator => {
  return () => {
    configureConfig(options);
  };
};

export const InjectConfigService = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getConfigServiceToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const InjectConfigLifecycleManager = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getConfigLifecycleToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};
