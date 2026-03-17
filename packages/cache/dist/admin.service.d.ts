import { CacheService } from "./cache.service";
import { CacheAdminClearResult, CacheAdminEntryDetails, CacheAdminModelDetails, CacheAdminModelSummary, CacheModelReference, HttpCacheRouteSummary } from "./types";
export declare class CacheAdminService {
    private readonly cache;
    constructor(cache: CacheService);
    listModels(): Promise<CacheAdminModelSummary[]>;
    inspectModel(model: CacheModelReference): Promise<CacheAdminModelDetails>;
    inspectEntry<T = any>(model: CacheModelReference<T>, key: string | number): Promise<CacheAdminEntryDetails<T>>;
    clearModel(model: CacheModelReference): Promise<CacheAdminClearResult>;
    clearAll(): Promise<CacheAdminClearResult[]>;
    deleteEntry(model: CacheModelReference, key: string | number): Promise<boolean>;
    listHttpCacheRoutes(): HttpCacheRouteSummary[];
    inspectHttpCacheRoute(method: string, path: string): HttpCacheRouteSummary;
}
