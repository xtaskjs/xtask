import path from "node:path";
import type { ZodTypeAny } from "zod";
import type { ConfigModuleOptions, ResolvedConfigModuleOptions } from "./types";

const DEFAULT_ENV_FILES = [".env"];

let configuration: ResolvedConfigModuleOptions | undefined;

const normalizeOptions = <TSchema extends ZodTypeAny>(
  value: ConfigModuleOptions<TSchema>
): ResolvedConfigModuleOptions => {
  if (!value?.schema) {
    throw new Error("Config schema is required. Call configureConfig({ schema }) with a valid Zod schema.");
  }

  return {
    schema: value.schema,
    envFiles: value.envFiles?.length ? [...value.envFiles] : [...DEFAULT_ENV_FILES],
    prefix: value.prefix,
    processEnvFirst: value.processEnvFirst !== false,
    processEnv: { ...(value.processEnv || process.env) },
    projectRoot: value.projectRoot ? path.resolve(value.projectRoot) : process.cwd(),
  };
};

export const configureConfig = <TSchema extends ZodTypeAny>(
  value: ConfigModuleOptions<TSchema>
): ResolvedConfigModuleOptions => {
  configuration = normalizeOptions(value);
  return getConfigConfiguration();
};

export const getConfigConfiguration = (): ResolvedConfigModuleOptions | undefined => {
  if (!configuration) {
    return undefined;
  }

  return {
    ...configuration,
    envFiles: [...configuration.envFiles],
    processEnv: { ...configuration.processEnv },
  };
};

export const getRequiredConfigConfiguration = (): ResolvedConfigModuleOptions => {
  const current = getConfigConfiguration();
  if (!current) {
    throw new Error(
      "Config module is not configured. Call configureConfig(...) or ConfigModule.register(...) before CreateApplication()."
    );
  }

  return current;
};

export const resetConfigConfiguration = (): void => {
  configuration = undefined;
};
