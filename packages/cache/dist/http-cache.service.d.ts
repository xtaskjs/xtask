import { RouteExecutionContext } from "@xtaskjs/common";
import { HttpCacheApplicationResult, HttpCachePolicyInspection, HttpCachePolicyOptions, HttpCacheRouteSummary, HttpCacheValidatorInspection } from "./types";
export declare class HttpCacheService {
    buildCacheControl(policy?: HttpCachePolicyOptions): string | undefined;
    handleResponse<T = any>(context: RouteExecutionContext, result: T, policy: HttpCachePolicyOptions<T>): Promise<HttpCacheApplicationResult<T>>;
    private shouldApplyPolicy;
    private resolveExpires;
    private resolveDateValue;
    private resolveEtag;
    private isNotModified;
    private setHeader;
    private setVaryHeader;
    private setNotModified;
    private toCacheSeconds;
    normalizePolicy(policy?: HttpCachePolicyOptions): HttpCachePolicyInspection;
    inspectValidators(policy?: HttpCachePolicyOptions): HttpCacheValidatorInspection;
    describeRoute(route: Pick<HttpCacheRouteSummary, "method" | "path" | "controller" | "handler">, policy?: HttpCachePolicyOptions): HttpCacheRouteSummary;
}
export declare const getBaseHttpCacheService: () => HttpCacheService;
export declare const getHttpCacheService: () => HttpCacheService;
