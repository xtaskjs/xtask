import { InjectionToken } from "./types";
export interface RuntimeInjector {
    get<T>(token: InjectionToken<T>): T;
    has(token: InjectionToken): boolean;
    destroy(): void;
}
export declare class TestingModule {
    private readonly injector;
    constructor(injector: RuntimeInjector);
    get<T>(token: InjectionToken<T>): T;
    resolve<T>(token: InjectionToken<T>): Promise<T>;
    has(token: InjectionToken): boolean;
    close(): Promise<void>;
}
