export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
export interface RouteExecutionContext {
    method: HttpMethod;
    path: string;
    args: any[];
    controller?: any;
    handler?: PropertyKey;
}
export type MiddlewareFn = (context: RouteExecutionContext, next: () => Promise<any>) => any | Promise<any>;
export type GuardFn = (context: RouteExecutionContext) => boolean | Promise<boolean>;
export type PipeFn = (value: any, context: RouteExecutionContext) => any | Promise<any>;
export type MiddlewareLike = MiddlewareFn | {
    use: MiddlewareFn;
};
export type GuardLike = GuardFn | {
    canActivate: GuardFn;
};
export type PipeLike = PipeFn | {
    transform: PipeFn;
};
export interface PipelineMetadata {
    middlewares: MiddlewareLike[];
    guards: GuardLike[];
    pipes: PipeLike[];
}
export interface ControllerOptions extends Partial<PipelineMetadata> {
    path?: string;
}
export interface RouteOptions extends Partial<PipelineMetadata> {
    path?: string;
}
export interface ControllerMetadata extends PipelineMetadata {
    path: string;
}
export interface RouteMetadata extends PipelineMetadata {
    method: HttpMethod;
    path: string;
    handler: PropertyKey;
}
