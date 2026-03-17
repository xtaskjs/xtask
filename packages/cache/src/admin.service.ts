import { getHttpCachePolicy } from "./http-cache.metadata";
import { resolveHttpCachePolicy } from "./configuration";
import { getCacheLifecycleManager } from "./lifecycle";
import { CacheService } from "./cache.service";
import { getBaseHttpCacheService } from "./http-cache.service";
import {
  CacheAdminClearResult,
  CacheAdminEntryDetails,
  CacheAdminModelDetails,
  CacheAdminModelSummary,
  CacheModelReference,
  HttpCacheRouteSummary,
} from "./types";
import { InjectCacheService } from "./decorators";

export class CacheAdminService {
  constructor(
    @InjectCacheService()
    private readonly cache: CacheService
  ) {}

  async listModels(): Promise<CacheAdminModelSummary[]> {
    const models = this.cache.listModels();
    return Promise.all(
      models.map(async (model) => {
        const repository = this.cache.getRepository(model.name);
        const keys = await repository.keys();
        return {
          ...model,
          keyCount: keys.length,
          store: repository.getStore().kind,
        };
      })
    );
  }

  async inspectModel(model: CacheModelReference): Promise<CacheAdminModelDetails> {
    const repository = this.cache.getRepository(model);
    const summary = repository.getSummary();
    const keys = await repository.keys();

    return {
      ...summary,
      keyCount: keys.length,
      store: repository.getStore().kind,
      keys,
    };
  }

  async inspectEntry<T = any>(
    model: CacheModelReference<T>,
    key: string | number
  ): Promise<CacheAdminEntryDetails<T>> {
    const entry = await this.cache.getRepository(model).getEntry(key);
    return {
      ...entry,
      model: typeof model === "string" ? model : model.name,
    };
  }

  async clearModel(model: CacheModelReference): Promise<CacheAdminClearResult> {
    return {
      model: typeof model === "string" ? model : model.name,
      removed: await this.cache.clear(model),
    };
  }

  async clearAll(): Promise<CacheAdminClearResult[]> {
    const models = this.cache.listModels();
    return Promise.all(
      models.map(async (model) => ({
        model: model.name,
        removed: await this.cache.clear(model.name),
      }))
    );
  }

  async deleteEntry(model: CacheModelReference, key: string | number): Promise<boolean> {
    return this.cache.delete(model, key);
  }

  listHttpCacheRoutes(): HttpCacheRouteSummary[] {
    const lifecycle = getCacheLifecycleManager().getLifecycle();
    if (!lifecycle) {
      return [];
    }

    return lifecycle
      .getControllerRoutes()
      .map((route: any) => {
        const routePolicy = getHttpCachePolicy(route.controller?.constructor, route.handler);
        if (!routePolicy) {
          return undefined;
        }

        return getBaseHttpCacheService().describeRoute(
          {
            method: route.method,
            path: route.path,
            controller: route.controller?.constructor?.name || "AnonymousController",
            handler: String(route.handler),
          },
          resolveHttpCachePolicy(routePolicy)
        );
      })
      .filter((route): route is HttpCacheRouteSummary => Boolean(route))
      .sort((left, right) => `${left.method} ${left.path}`.localeCompare(`${right.method} ${right.path}`));
  }

  inspectHttpCacheRoute(method: string, path: string): HttpCacheRouteSummary {
    const normalizedMethod = String(method || "").trim().toUpperCase();
    const normalizedPath = String(path || "").trim();
    const route = this.listHttpCacheRoutes().find(
      (candidate) => candidate.method === normalizedMethod && candidate.path === normalizedPath
    );

    if (!route) {
      throw new Error(`HTTP cache route '${normalizedMethod} ${normalizedPath}' is not registered`);
    }

    return route;
  }
}