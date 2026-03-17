import "reflect-metadata";
import { HttpCachePolicyOptions } from "./types";
export declare const registerHttpCacheClassPolicy: (target: any, policy: HttpCachePolicyOptions) => HttpCachePolicyOptions;
export declare const registerHttpCacheMethodPolicy: (target: any, handler: PropertyKey, policy: HttpCachePolicyOptions) => HttpCachePolicyOptions;
export declare const getHttpCacheClassPolicy: (target: any) => HttpCachePolicyOptions | undefined;
export declare const getHttpCacheMethodPolicy: (target: any, handler: PropertyKey) => HttpCachePolicyOptions | undefined;
export declare const getHttpCachePolicy: (target: any, handler?: PropertyKey) => HttpCachePolicyOptions | undefined;
