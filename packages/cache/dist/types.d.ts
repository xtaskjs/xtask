import type { Container } from "@xtaskjs/core";
import type { RouteExecutionContext } from "@xtaskjs/common";
export type CacheDriver = "memory" | "redis";
export type CacheTtlInput = number | string;
export type CacheModelReference<T = any> = string | (new (...args: any[]) => T);
export type CacheValueFactory<T> = () => T | Promise<T>;
export type CacheKeyBuilder = (...args: any[]) => string | number;
export type CacheCondition<T = any> = (result: T, ...args: any[]) => boolean;
export interface CacheStoreRecord {
    key: string;
    value: string;
    expiresAt?: number;
}
export interface CacheStoreSetOptions {
    ttlMs?: number;
}
export interface CacheStore {
    kind: string;
    connect?: () => Promise<void>;
    get: (key: string) => Promise<CacheStoreRecord | undefined>;
    set: (key: string, value: string, options?: CacheStoreSetOptions) => Promise<void>;
    delete: (key: string) => Promise<boolean>;
    clear: (prefix?: string) => Promise<number>;
    keys: (prefix?: string) => Promise<string[]>;
    disconnect?: () => Promise<void>;
}
export interface CacheRedisClient {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, options?: Record<string, any>) => Promise<any>;
    del: (...keys: string[]) => Promise<number>;
    keys?: (pattern: string) => Promise<string[]>;
    scanIterator?: (options?: Record<string, any>) => AsyncIterable<string>;
    connect?: () => Promise<void>;
    quit?: () => Promise<void>;
    disconnect?: () => Promise<void>;
    isOpen?: boolean;
}
export interface CacheRedisConnectionOptions {
    url?: string;
    username?: string;
    password?: string;
    database?: number;
    socket?: Record<string, any>;
    connectOnStart?: boolean;
    client?: CacheRedisClient;
    clientFactory?: () => CacheRedisClient | Promise<CacheRedisClient>;
    options?: Record<string, any>;
}
export interface CacheConfiguration {
    defaultDriver?: CacheDriver;
    defaultTtl?: CacheTtlInput;
    namespace?: string;
    connectOnStart?: boolean;
    failOnDuplicateModels?: boolean;
    httpCacheDefaults?: HttpCachePolicyOptions;
    redis?: CacheRedisConnectionOptions;
}
export interface RegisteredCacheConfiguration {
    defaultDriver: CacheDriver;
    defaultTtlMs?: number;
    namespace: string;
    connectOnStart: boolean;
    failOnDuplicateModels: boolean;
    httpCacheDefaults?: HttpCachePolicyOptions;
    redis?: CacheRedisConnectionOptions;
}
export interface CacheModelSerialization<T = any> {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
}
export interface CacheModelOptions<T = any> extends CacheModelSerialization<T> {
    name?: string;
    driver?: CacheDriver;
    ttl?: CacheTtlInput;
    namespace?: string;
    prefix?: string;
    store?: CacheStore | CacheStoreFactory;
    redis?: CacheRedisConnectionOptions;
}
export interface RegisteredCacheModelOptions<T = any> extends CacheModelSerialization<T> {
    name: string;
    driver: CacheDriver;
    ttlMs?: number;
    namespace: string;
    prefix: string;
    store?: CacheStore | CacheStoreFactory;
    redis?: CacheRedisConnectionOptions;
    reference?: CacheModelReference<T>;
}
export interface CacheStoreFactoryContext {
    model: RegisteredCacheModelOptions;
    container?: Container;
    configuration: RegisteredCacheConfiguration;
}
export type CacheStoreFactory = (context: CacheStoreFactoryContext) => CacheStore | Promise<CacheStore>;
export interface CacheLookupResult<T = any> {
    hit: boolean;
    key: string;
    value?: T;
}
export interface CacheEntryOptions {
    ttl?: CacheTtlInput;
}
export interface CacheRepositorySummary {
    name: string;
    driver: CacheDriver;
    namespace: string;
    prefix: string;
    ttlMs?: number;
}
export interface CacheAdminModelSummary extends CacheRepositorySummary {
    keyCount: number;
    store: string;
}
export interface CacheAdminModelDetails extends CacheAdminModelSummary {
    keys: string[];
}
export interface CacheAdminEntryDetails<T = any> extends CacheLookupResult<T> {
    model: string;
}
export interface CacheAdminClearResult {
    model: string;
    removed: number;
}
export interface CacheManagementControllerOptions {
    path?: string;
}
export type HttpCacheVisibility = "public" | "private";
export type HttpCacheDateValue = Date | number | string;
export type HttpCacheDateProvider<T = any> = (result: T, context: RouteExecutionContext) => HttpCacheDateValue | undefined;
export type HttpCacheEtagValueProvider<T = any> = (result: T, context: RouteExecutionContext) => any;
export interface HttpCacheEtagOptions<T = any> {
    weak?: boolean;
    value?: HttpCacheEtagValueProvider<T> | string;
}
export interface HttpCachePolicyOptions<T = any> {
    visibility?: HttpCacheVisibility;
    maxAge?: CacheTtlInput;
    sharedMaxAge?: CacheTtlInput;
    staleWhileRevalidate?: CacheTtlInput;
    staleIfError?: CacheTtlInput;
    immutable?: boolean;
    noStore?: boolean;
    noCache?: boolean;
    mustRevalidate?: boolean;
    proxyRevalidate?: boolean;
    vary?: string | string[];
    etag?: boolean | HttpCacheEtagOptions<T>;
    lastModified?: HttpCacheDateValue | HttpCacheDateProvider<T>;
    expiresIn?: CacheTtlInput;
    expiresAt?: HttpCacheDateValue | HttpCacheDateProvider<T>;
    viewsOnly?: boolean;
    when?: (result: T, context: RouteExecutionContext) => boolean;
}
export interface HttpCacheApplicationResult<T = any> {
    handled: boolean;
    notModified: boolean;
    result: T | undefined;
    etag?: string;
    lastModified?: string;
}
export interface HttpCachePolicyInspection {
    visibility?: HttpCacheVisibility;
    maxAgeMs?: number;
    sharedMaxAgeMs?: number;
    staleWhileRevalidateMs?: number;
    staleIfErrorMs?: number;
    immutable: boolean;
    noStore: boolean;
    noCache: boolean;
    mustRevalidate: boolean;
    proxyRevalidate: boolean;
    vary: string[];
    viewsOnly: boolean;
}
export interface HttpCacheValidatorInspection {
    etag: {
        enabled: boolean;
        weak?: boolean;
        customValue: boolean;
    };
    lastModified: {
        enabled: boolean;
        dynamic: boolean;
    };
    expires: {
        enabled: boolean;
        mode?: "at" | "in" | "max-age";
    };
}
export interface HttpCacheRouteSummary {
    method: string;
    path: string;
    controller: string;
    handler: string;
    cacheControl?: string;
    policy: HttpCachePolicyInspection;
    validators: HttpCacheValidatorInspection;
}
export interface CacheableOptions<T = any> {
    model: CacheModelReference<T>;
    key?: string | number | CacheKeyBuilder;
    ttl?: CacheTtlInput;
    unless?: CacheCondition<T>;
}
export interface CachePutOptions<T = any> {
    model: CacheModelReference<T>;
    key?: string | number | CacheKeyBuilder;
    ttl?: CacheTtlInput;
    when?: CacheCondition<T>;
}
export interface CacheEvictOptions<T = any> {
    model: CacheModelReference<T>;
    key?: string | number | CacheKeyBuilder;
    all?: boolean;
    beforeInvocation?: boolean;
    when?: CacheCondition<any>;
}
