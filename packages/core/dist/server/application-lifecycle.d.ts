import { GuardLike, HttpMethod, LifeCyclePhase, MiddlewareLike, PipeLike } from "@xtaskjs/common";
interface ControllerRoute {
    method: HttpMethod;
    path: string;
    controller: any;
    handler: PropertyKey;
    middlewares: MiddlewareLike[];
    guards: GuardLike[];
    pipes: PipeLike[];
    action: (...args: any[]) => any | Promise<any>;
}
export declare class ApplicationLifeCycle {
    private listeners;
    private metricsInterval?;
    private runners;
    private controllerRoutes;
    constructor();
    on(event: LifeCyclePhase, Listener: (...args: any[]) => any | Promise<any>, priority?: number): void;
    registerRunner(fn: (args?: string[]) => any, type?: "ApplicationRunner" | "CommandLineRunner", priority?: number): void;
    registerControllerRoute(route: ControllerRoute): void;
    getControllerRoutes(): ControllerRoute[];
    private runGuard;
    private runPipe;
    private runMiddleware;
    dispatchControllerRoute(method: HttpMethod, path: string, ...args: any[]): Promise<any>;
    emit(event: LifeCyclePhase, payload?: any): Promise<void>;
    runRunners(type: "ApplicationRunner" | "CommandLineRunner"): Promise<void>;
    boot(startFn: () => Promise<void>): Promise<void>;
    stop(): Promise<void>;
}
export {};
