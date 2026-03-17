import { HttpCachePolicyInspection, HttpCachePolicyOptions } from "./types";
export declare const normalizeHttpCacheVary: (value?: string | string[]) => string[] | undefined;
export declare const mergeHttpCachePolicy: (existingPolicy?: HttpCachePolicyOptions, nextPolicy?: HttpCachePolicyOptions) => HttpCachePolicyOptions;
export declare const inspectHttpCachePolicy: (policy?: HttpCachePolicyOptions) => HttpCachePolicyInspection;
