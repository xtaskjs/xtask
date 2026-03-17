import { CacheEntryOptions, CacheLookupResult, CacheRepositorySummary, CacheStore, CacheValueFactory, RegisteredCacheModelOptions } from "./types";
export declare class CacheRepository<T = any> {
    private readonly model;
    private readonly store;
    constructor(model: RegisteredCacheModelOptions<T>, store: CacheStore);
    getSummary(): CacheRepositorySummary;
    getStore(): CacheStore;
    get(key: string | number): Promise<T | undefined>;
    getEntry(key: string | number): Promise<CacheLookupResult<T>>;
    has(key: string | number): Promise<boolean>;
    set(key: string | number, value: T, options?: CacheEntryOptions): Promise<T>;
    remember(key: string | number, factory: CacheValueFactory<T>, options?: CacheEntryOptions): Promise<T>;
    delete(key: string | number): Promise<boolean>;
    clear(): Promise<number>;
    keys(): Promise<string[]>;
    private serialize;
    private deserialize;
    private normalizeKey;
    private resolveStoragePrefix;
    private resolveStorageKey;
}
