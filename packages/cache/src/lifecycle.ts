import { ApplicationLifeCycle, Container } from "@xtaskjs/core";
import {
  getCacheConfiguration,
  getRegisteredCacheModel,
  getRegisteredCacheModels,
  resetCacheConfiguration,
} from "./configuration";
import { CacheRepository } from "./cache.repository";
import { CacheAdminService } from "./admin.service";
import { CacheService } from "./cache.service";
import { getBaseHttpCacheService } from "./http-cache.service";
import {
  getCacheAdminServiceToken,
  getCacheHttpServiceToken,
  getCacheLifecycleToken,
  getCacheRepositoryToken,
  getCacheServiceToken,
} from "./tokens";
import {
  CacheModelReference,
  CacheRepositorySummary,
  CacheStore,
  CacheStoreFactory,
  RegisteredCacheModelOptions,
} from "./types";
import { MemoryCacheStore, RedisCacheStore } from "./stores";

const shouldConnectStore = (
  defaultConnectOnStart: boolean,
  definition: RegisteredCacheModelOptions
): boolean => {
  return definition.redis?.connectOnStart ?? defaultConnectOnStart;
};

export class CacheLifecycleManager {
  private readonly repositories = new Map<string, CacheRepository<any>>();
  private readonly stores = new Map<string, CacheStore>();
  private readonly disconnectableStores = new Set<CacheStore>();
  private readonly memoryStore = new MemoryCacheStore();
  private container?: Container;
  private lifecycle?: ApplicationLifeCycle;
  private initialized = false;
  private stoppingRegistered = false;

  async initialize(container?: Container, lifecycle?: ApplicationLifeCycle): Promise<void> {
    await this.destroy();
    this.container = container;
    this.lifecycle = lifecycle;
    this.initialized = true;

    for (const definition of getRegisteredCacheModels()) {
      await this.ensureRepository(definition.reference || definition.name);
    }

    this.registerContainerBindings(container);

    if (!this.stoppingRegistered && lifecycle && typeof (lifecycle as any).on === "function") {
      lifecycle.on("stopping", async () => {
        await this.destroy();
      });
      this.stoppingRegistered = true;
    }
  }

  async destroy(): Promise<void> {
    for (const store of Array.from(this.disconnectableStores.values())) {
      if (typeof store.disconnect === "function") {
        await store.disconnect();
      }
    }

    await this.memoryStore.clear();
    this.disconnectableStores.clear();
    this.repositories.clear();
    this.stores.clear();
    this.container = undefined;
    this.lifecycle = undefined;
    this.initialized = false;
    this.stoppingRegistered = false;
  }

  isInitialized(model?: CacheModelReference): boolean {
    if (!model) {
      return this.initialized;
    }

    return this.repositories.has(this.resolveModelDefinition(model).name);
  }

  getLifecycle(): ApplicationLifeCycle | undefined {
    return this.lifecycle;
  }

  listModels(): CacheRepositorySummary[] {
    return Array.from(this.repositories.values())
      .map((repository) => repository.getSummary())
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  getRepository<T = any>(model: CacheModelReference<T>): CacheRepository<T> {
    const definition = this.resolveModelDefinition(model);
    const existingRepository = this.repositories.get(definition.name);
    if (existingRepository) {
      return existingRepository as CacheRepository<T>;
    }

    throw new Error(`Cache model '${definition.name}' is not initialized. Call initializeCacheIntegration() first.`);
  }

  async ensureRepository<T = any>(model: CacheModelReference<T>): Promise<CacheRepository<T>> {
    const definition = this.resolveModelDefinition(model);
    const existingRepository = this.repositories.get(definition.name);
    if (existingRepository) {
      return existingRepository as CacheRepository<T>;
    }

    const store = await this.resolveStore(definition);
    const repository = new CacheRepository<T>(definition, store);
    this.repositories.set(definition.name, repository);

    if (this.container && typeof (this.container as any).registerNamedInstance === "function") {
      (this.container as any).registerNamedInstance(getCacheRepositoryToken(definition.name), repository);
    }

    return repository;
  }

  private resolveModelDefinition<T = any>(model: CacheModelReference<T>): RegisteredCacheModelOptions<T> {
    const definition = getRegisteredCacheModel(model);
    if (!definition) {
      throw new Error(`Cache model '${typeof model === "string" ? model : model.name}' is not registered`);
    }

    return definition;
  }

  private async resolveStore(definition: RegisteredCacheModelOptions): Promise<CacheStore> {
    const existingStore = this.stores.get(definition.name);
    if (existingStore) {
      return existingStore;
    }

    let store: CacheStore;

    if (definition.store) {
      store = await this.resolveCustomStore(definition);
    } else if (definition.driver === "redis") {
      store = new RedisCacheStore({
        ...(getCacheConfiguration().redis || {}),
        ...(definition.redis || {}),
      });
      this.disconnectableStores.add(store);
    } else {
      store = this.memoryStore;
    }

    this.stores.set(definition.name, store);

    if (shouldConnectStore(getCacheConfiguration().connectOnStart, definition) && typeof store.connect === "function") {
      await store.connect();
    }

    return store;
  }

  private async resolveCustomStore(definition: RegisteredCacheModelOptions): Promise<CacheStore> {
    const configuredStore = definition.store;
    if (!configuredStore) {
      throw new Error(`Cache model '${definition.name}' does not define a custom store`);
    }

    const store =
      typeof configuredStore === "function"
        ? await (configuredStore as CacheStoreFactory)({
            model: definition,
            container: this.container,
            configuration: getCacheConfiguration(),
          })
        : configuredStore;

    if (typeof store.disconnect === "function") {
      this.disconnectableStores.add(store);
    }

    return store;
  }

  private registerContainerBindings(container?: Container): void {
    if (!container) {
      return;
    }

    const anyContainer = container as any;
    if (typeof anyContainer.registerNamedInstance === "function") {
      anyContainer.registerNamedInstance(getCacheLifecycleToken(), this);
      anyContainer.registerNamedInstance(getCacheHttpServiceToken(), getBaseHttpCacheService());

      for (const [name, repository] of this.repositories.entries()) {
        anyContainer.registerNamedInstance(getCacheRepositoryToken(name), repository);
      }
    }

    if (typeof anyContainer.registerWithName === "function") {
      anyContainer.registerWithName(CacheService, { scope: "singleton" }, getCacheServiceToken());
      anyContainer.registerWithName(
        CacheAdminService,
        { scope: "singleton" },
        getCacheAdminServiceToken()
      );
    }
  }
}

const lifecycleManager = new CacheLifecycleManager();

export const initializeCacheIntegration = async (
  container?: Container,
  lifecycle?: ApplicationLifeCycle
): Promise<void> => {
  await lifecycleManager.initialize(container, lifecycle);
};

export const shutdownCacheIntegration = async (): Promise<void> => {
  await lifecycleManager.destroy();
};

export const getCacheLifecycleManager = (): CacheLifecycleManager => {
  return lifecycleManager;
};

export const resetCacheIntegration = async (): Promise<void> => {
  await shutdownCacheIntegration();
  resetCacheConfiguration();
};