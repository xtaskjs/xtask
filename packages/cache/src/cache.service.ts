import { CacheRepository } from "./cache.repository";
import { getCacheLifecycleManager } from "./lifecycle";
import { CacheEntryOptions, CacheModelReference, CacheRepositorySummary, CacheValueFactory } from "./types";

export class CacheService {
  listModels(): CacheRepositorySummary[] {
    return getCacheLifecycleManager().listModels();
  }

  isInitialized(model?: CacheModelReference): boolean {
    return getCacheLifecycleManager().isInitialized(model);
  }

  getRepository<T = any>(model: CacheModelReference<T>): CacheRepository<T> {
    return getCacheLifecycleManager().getRepository(model);
  }

  async get<T = any>(model: CacheModelReference<T>, key: string | number): Promise<T | undefined> {
    return this.getRepository(model).get(key);
  }

  async set<T = any>(
    model: CacheModelReference<T>,
    key: string | number,
    value: T,
    options: CacheEntryOptions = {}
  ): Promise<T> {
    return this.getRepository(model).set(key, value, options);
  }

  async remember<T = any>(
    model: CacheModelReference<T>,
    key: string | number,
    factory: CacheValueFactory<T>,
    options: CacheEntryOptions = {}
  ): Promise<T> {
    return this.getRepository(model).remember(key, factory, options);
  }

  async delete(model: CacheModelReference, key: string | number): Promise<boolean> {
    return this.getRepository(model).delete(key);
  }

  async clear(model: CacheModelReference): Promise<number> {
    return this.getRepository(model).clear();
  }

  async keys(model: CacheModelReference): Promise<string[]> {
    return this.getRepository(model).keys();
  }
}