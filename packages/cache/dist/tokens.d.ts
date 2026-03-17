import { CacheModelReference } from "./types";
export declare const resolveCacheModelName: (value: CacheModelReference) => string;
export declare const getCacheServiceToken: () => string;
export declare const getCacheLifecycleToken: () => string;
export declare const getCacheAdminServiceToken: () => string;
export declare const getCacheHttpServiceToken: () => string;
export declare const getCacheRepositoryToken: (model: CacheModelReference) => string;
