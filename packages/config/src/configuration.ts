import path from "node:path";
import { ZodError, type ZodTypeAny } from "zod";
import { loadEnvironment } from "./env.loader";
import { ConfigValidationError } from "./errors";
import { ConfigService } from "./service";
import type { ConfigModuleOptions, ResolvedConfigModuleOptions } from "./types";

const DEFAULT_ENV_FILES = [".env"];

let configuration: ResolvedConfigModuleOptions | undefined;
let configuredService: ConfigService<Record<string, unknown>> | undefined;
let configuredLoadedFiles: string[] = [];

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
  const normalized = normalizeOptions(value);
  const loadedEnvironment = loadEnvironment(normalized);

  try {
    const parsed = normalized.schema.parse(loadedEnvironment.values);
    configuration = normalized;
    configuredService = new ConfigService(parsed as Record<string, unknown>);
    configuredLoadedFiles = loadedEnvironment.loadedFiles;
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ConfigValidationError({
        issues: error.issues,
        keyMap: loadedEnvironment.keyMap,
      });
    }

    throw error;
  }

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
  configuredService = undefined;
  configuredLoadedFiles = [];
};

export const getConfiguredConfigService = <
  TConfig extends Record<string, unknown> = Record<string, unknown>
>(): ConfigService<TConfig> | undefined => {
  return configuredService as ConfigService<TConfig> | undefined;
};

export const getConfiguredLoadedFiles = (): string[] => {
  return [...configuredLoadedFiles];
};
