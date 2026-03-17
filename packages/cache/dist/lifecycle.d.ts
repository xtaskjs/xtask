import { ApplicationLifeCycle, Container } from "@xtaskjs/core";
import { CacheRepository } from "./cache.repository";
import { CacheModelReference, CacheRepositorySummary } from "./types";
export declare class CacheLifecycleManager {
    private readonly repositories;
    private readonly stores;
    private readonly disconnectableStores;
    private readonly memoryStore;
    private container?;
    private lifecycle?;
    private initialized;
    private stoppingRegistered;
    initialize(container?: Container, lifecycle?: ApplicationLifeCycle): Promise<void>;
    destroy(): Promise<void>;
    isInitialized(model?: CacheModelReference): boolean;
    getLifecycle(): ApplicationLifeCycle | undefined;
    listModels(): CacheRepositorySummary[];
    getRepository<T = any>(model: CacheModelReference<T>): CacheRepository<T>;
    ensureRepository<T = any>(model: CacheModelReference<T>): Promise<CacheRepository<T>>;
    private resolveModelDefinition;
    private resolveStore;
    private resolveCustomStore;
    private registerContainerBindings;
}
export declare const initializeCacheIntegration: (container?: Container, lifecycle?: ApplicationLifeCycle) => Promise<void>;
export declare const shutdownCacheIntegration: () => Promise<void>;
export declare const getCacheLifecycleManager: () => CacheLifecycleManager;
export declare const resetCacheIntegration: () => Promise<void>;
