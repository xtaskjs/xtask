import { HttpCachePolicyOptions } from "./types";
export declare const CacheResponse: <T = any>(policy?: HttpCachePolicyOptions<T>) => MethodDecorator & ClassDecorator;
export declare const BrowserCache: <T = any>(policy?: HttpCachePolicyOptions<T>) => MethodDecorator & ClassDecorator;
export declare const CacheHeaders: <T = any>(policy?: HttpCachePolicyOptions<T>) => MethodDecorator & ClassDecorator;
export declare const CacheView: <T = any>(policy?: HttpCachePolicyOptions<T>) => MethodDecorator & ClassDecorator;
export declare const NoStore: () => MethodDecorator & ClassDecorator;
export declare const NoCache: () => MethodDecorator & ClassDecorator;
export declare const VaryBy: (...headers: string[]) => MethodDecorator & ClassDecorator;
