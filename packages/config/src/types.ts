import type { Container } from "@xtaskjs/core";
import type { ZodIssue, ZodTypeAny } from "zod";

export type InferConfig<TSchema extends ZodTypeAny> = import("zod").infer<TSchema>;

export interface ConfigModuleOptions<TSchema extends ZodTypeAny = ZodTypeAny> {
  schema: TSchema;
  envFiles?: string[];
  prefix?: string;
  processEnvFirst?: boolean;
  processEnv?: Record<string, string | undefined>;
  projectRoot?: string;
}

export interface ConfigModuleAsyncOptions<TSchema extends ZodTypeAny = ZodTypeAny> {
  useFactory: (
    container?: Container
  ) => Promise<ConfigModuleOptions<TSchema>> | ConfigModuleOptions<TSchema>;
  container?: Container;
}

export interface ResolvedConfigModuleOptions {
  schema: ZodTypeAny;
  envFiles: string[];
  prefix?: string;
  processEnvFirst: boolean;
  processEnv: Record<string, string | undefined>;
  projectRoot: string;
}

export interface LoadedEnvironment {
  values: Record<string, string | undefined>;
  keyMap: Record<string, string>;
  loadedFiles: string[];
}

export interface ConfigValidationIssue {
  key: string;
  envKey: string;
  path: string;
  message: string;
  code: string;
}

export interface ConfigValidationErrorOptions {
  issues: ZodIssue[];
  keyMap: Record<string, string>;
}

export interface ConfigServiceLike<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  get<K extends keyof TConfig>(key: K): TConfig[K];
  getOrUndefined<K extends keyof TConfig>(key: K): TConfig[K] | undefined;
  getOrDefault<K extends keyof TConfig>(key: K, defaultValue: TConfig[K]): TConfig[K];
  has<K extends keyof TConfig>(key: K): boolean;
  getAll(): Readonly<TConfig>;
}
