export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface RouteExecutionContext {
  method: HttpMethod;
  path: string;
  args: any[];
  controller?: any;
  handler?: PropertyKey;
  request?: any;
  response?: any;
  state: Record<string, any>;
  auth: RouteAuthenticationContext;
}

export interface RouteAuthenticationContext {
  isAuthenticated: boolean;
  strategy?: string;
  token?: string;
  user?: any;
  claims?: Record<string, any>;
  roles: string[];
}

export type MiddlewareFn = (
  context: RouteExecutionContext,
  next: () => Promise<any>
) => any | Promise<any>;

export type GuardFn = (
  context: RouteExecutionContext
) => boolean | Promise<boolean>;

export type PipeFn = (
  value: any,
  context: RouteExecutionContext
) => any | Promise<any>;

export type RouteParameterSource =
  | "body"
  | "query"
  | "param"
  | "request"
  | "response";

export interface RouteParameterMetadata {
  index: number;
  source: RouteParameterSource;
  property?: string;
  metatype?: any;
}

export type MiddlewareLike = MiddlewareFn | { use: MiddlewareFn };
export type GuardLike = GuardFn | { canActivate: GuardFn };
export type PipeLike = PipeFn | { transform: PipeFn };

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
  parameters: RouteParameterMetadata[];
}
