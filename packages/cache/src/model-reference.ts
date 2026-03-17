import { CacheModelReference } from "./types";

export const resolveDeclaredCacheModelName = (value: CacheModelReference): string => {
  if (typeof value === "string") {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      throw new Error("Cache model name requires a non-empty string");
    }
    return normalizedValue;
  }

  if (typeof value?.name === "string" && value.name.trim().length > 0) {
    return value.name.trim();
  }

  throw new Error("Cache model reference must be a non-empty string or a named class");
};