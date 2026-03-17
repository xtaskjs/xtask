import { CacheRedisConnectionOptions, CacheStore, CacheStoreRecord, CacheStoreSetOptions } from "./types";
export declare class MemoryCacheStore implements CacheStore {
    readonly kind = "memory";
    private readonly entries;
    get(key: string): Promise<CacheStoreRecord | undefined>;
    set(key: string, value: string, options?: CacheStoreSetOptions): Promise<void>;
    delete(key: string): Promise<boolean>;
    clear(prefix?: string): Promise<number>;
    keys(prefix?: string): Promise<string[]>;
}
export declare class RedisCacheStore implements CacheStore {
    private readonly options;
    readonly kind = "redis";
    private client?;
    private owned;
    constructor(options?: CacheRedisConnectionOptions);
    private getClient;
    connect(): Promise<void>;
    get(key: string): Promise<CacheStoreRecord | undefined>;
    set(key: string, value: string, options?: CacheStoreSetOptions): Promise<void>;
    delete(key: string): Promise<boolean>;
    clear(prefix?: string): Promise<number>;
    keys(prefix?: string): Promise<string[]>;
    disconnect(): Promise<void>;
}
