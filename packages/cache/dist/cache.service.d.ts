import { CacheRepository } from "./cache.repository";
import { CacheEntryOptions, CacheModelReference, CacheRepositorySummary, CacheValueFactory } from "./types";
export declare class CacheService {
    listModels(): CacheRepositorySummary[];
    isInitialized(model?: CacheModelReference): boolean;
    getRepository<T = any>(model: CacheModelReference<T>): CacheRepository<T>;
    get<T = any>(model: CacheModelReference<T>, key: string | number): Promise<T | undefined>;
    set<T = any>(model: CacheModelReference<T>, key: string | number, value: T, options?: CacheEntryOptions): Promise<T>;
    remember<T = any>(model: CacheModelReference<T>, key: string | number, factory: CacheValueFactory<T>, options?: CacheEntryOptions): Promise<T>;
    delete(model: CacheModelReference, key: string | number): Promise<boolean>;
    clear(model: CacheModelReference): Promise<number>;
    keys(model: CacheModelReference): Promise<string[]>;
}
