import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import type { LoadedEnvironment, ResolvedConfigModuleOptions } from "./types";

const mergeEnvironment = (
  left: Record<string, string | undefined>,
  right: Record<string, string | undefined>
): Record<string, string | undefined> => {
  return {
    ...left,
    ...right,
  };
};

const normalizePrefix = (prefix?: string): string | undefined => {
  const trimmed = prefix?.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.endsWith("_") ? trimmed : `${trimmed}_`;
};

const applyPrefix = (
  environment: Record<string, string | undefined>,
  prefix?: string
): Pick<LoadedEnvironment, "values" | "keyMap"> => {
  const normalizedPrefix = normalizePrefix(prefix);
  if (!normalizedPrefix) {
    const keyMap: Record<string, string> = {};
    for (const key of Object.keys(environment)) {
      keyMap[key] = key;
    }

    return {
      values: { ...environment },
      keyMap,
    };
  }

  const values: Record<string, string | undefined> = {};
  const keyMap: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(environment)) {
    if (!rawKey.startsWith(normalizedPrefix)) {
      continue;
    }

    const strippedKey = rawKey.slice(normalizedPrefix.length);
    if (!strippedKey) {
      continue;
    }

    values[strippedKey] = rawValue;
    keyMap[strippedKey] = rawKey;
  }

  return { values, keyMap };
};

const loadEnvFiles = (options: ResolvedConfigModuleOptions): Pick<LoadedEnvironment, "values" | "loadedFiles"> => {
  let values: Record<string, string | undefined> = {};
  const loadedFiles: string[] = [];

  for (const envFile of options.envFiles) {
    const fullPath = path.resolve(options.projectRoot, envFile);
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const parsed = dotenv.parse(fs.readFileSync(fullPath, "utf8"));
    values = mergeEnvironment(values, parsed);
    loadedFiles.push(fullPath);
  }

  return { values, loadedFiles };
};

export const loadEnvironment = (options: ResolvedConfigModuleOptions): LoadedEnvironment => {
  const loadedFromFiles = loadEnvFiles(options);
  const merged = options.processEnvFirst
    ? mergeEnvironment(loadedFromFiles.values, options.processEnv)
    : mergeEnvironment(options.processEnv, loadedFromFiles.values);

  const prefixed = applyPrefix(merged, options.prefix);

  return {
    ...prefixed,
    loadedFiles: loadedFromFiles.loadedFiles,
  };
};
