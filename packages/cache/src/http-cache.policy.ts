import { parseCacheDuration } from "./configuration";
import { HttpCachePolicyInspection, HttpCachePolicyOptions } from "./types";

export const normalizeHttpCacheVary = (value?: string | string[]): string[] | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = Array.from(
    new Set(
      (Array.isArray(value) ? value : [value])
        .flatMap((entry) => String(entry).split(","))
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );

  return normalized.length > 0 ? normalized : undefined;
};

export const mergeHttpCachePolicy = (
  existingPolicy: HttpCachePolicyOptions = {},
  nextPolicy: HttpCachePolicyOptions = {}
): HttpCachePolicyOptions => {
  return {
    ...existingPolicy,
    ...nextPolicy,
    vary: normalizeHttpCacheVary([
      ...(normalizeHttpCacheVary(existingPolicy.vary) || []),
      ...(normalizeHttpCacheVary(nextPolicy.vary) || []),
    ]),
  };
};

export const inspectHttpCachePolicy = (
  policy: HttpCachePolicyOptions = {}
): HttpCachePolicyInspection => {
  return {
    visibility: policy.visibility,
    maxAgeMs: parseCacheDuration(policy.maxAge),
    sharedMaxAgeMs: parseCacheDuration(policy.sharedMaxAge),
    staleWhileRevalidateMs: parseCacheDuration(policy.staleWhileRevalidate),
    staleIfErrorMs: parseCacheDuration(policy.staleIfError),
    immutable: policy.immutable === true,
    noStore: policy.noStore === true,
    noCache: policy.noCache === true,
    mustRevalidate: policy.mustRevalidate === true,
    proxyRevalidate: policy.proxyRevalidate === true,
    vary: normalizeHttpCacheVary(policy.vary) || [],
    viewsOnly: policy.viewsOnly === true,
  };
};