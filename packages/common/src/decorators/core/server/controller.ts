import {
  CLASS_PIPELINE_KEY,
  CONTROLLERS_KEY,
  METHOD_PARAMETERS_KEY,
  METHOD_PIPELINES_KEY,
  ROUTES_KEY,
} from "./constants";
import {
  ControllerMetadata,
  ControllerOptions,
  GuardLike,
  HttpMethod,
  MiddlewareLike,
  PipeLike,
  PipelineMetadata,
  RouteParameterMetadata,
  RouteParameterSource,
  RouteMetadata,
  RouteOptions,
} from "../../../types";

type MethodPipelineEntry = {
  handler: PropertyKey;
  pipeline: PipelineMetadata;
};

type MethodParameterEntry = {
  handler: PropertyKey;
  parameters: RouteParameterMetadata[];
};

type StoredRouteMetadata = Omit<RouteMetadata, keyof PipelineMetadata | "parameters">;

const emptyPipeline = (): PipelineMetadata => ({
  middlewares: [],
  guards: [],
  pipes: [],
});

const normalizePath = (value?: string): string => {
  const source = (value || "").trim();
  if (!source || source === "/") {
    return "";
  }
  const withLeadingSlash = source.startsWith("/") ? source : `/${source}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
};

const getClassPipeline = (target: any): PipelineMetadata => {
  const meta = Reflect.getMetadata(CLASS_PIPELINE_KEY, target) as
    | PipelineMetadata
    | undefined;
  return meta || emptyPipeline();
};

const setClassPipeline = (target: any, pipeline: PipelineMetadata) => {
  Reflect.defineMetadata(CLASS_PIPELINE_KEY, pipeline, target);
};

const getMethodPipelines = (target: any): MethodPipelineEntry[] => {
  const entries = Reflect.getMetadata(METHOD_PIPELINES_KEY, target) as
    | MethodPipelineEntry[]
    | undefined;
  return entries || [];
};

const setMethodPipelines = (target: any, entries: MethodPipelineEntry[]) => {
  Reflect.defineMetadata(METHOD_PIPELINES_KEY, entries, target);
};

const getMethodParameters = (target: any): MethodParameterEntry[] => {
  const entries = Reflect.getMetadata(METHOD_PARAMETERS_KEY, target) as
    | MethodParameterEntry[]
    | undefined;
  return entries || [];
};

const setMethodParameters = (target: any, entries: MethodParameterEntry[]) => {
  Reflect.defineMetadata(METHOD_PARAMETERS_KEY, entries, target);
};

const ensureMethodPipeline = (target: any, handler: PropertyKey): PipelineMetadata => {
  const entries = getMethodPipelines(target);
  let entry = entries.find((candidate) => candidate.handler === handler);
  if (!entry) {
    entry = { handler, pipeline: emptyPipeline() };
    entries.push(entry);
    setMethodPipelines(target, entries);
  }
  return entry.pipeline;
};

const appendClassMiddlewares = (target: any, middlewares: MiddlewareLike[]) => {
  const pipeline = getClassPipeline(target);
  pipeline.middlewares.push(...middlewares);
  setClassPipeline(target, pipeline);
};

const appendClassGuards = (target: any, guards: GuardLike[]) => {
  const pipeline = getClassPipeline(target);
  pipeline.guards.push(...guards);
  setClassPipeline(target, pipeline);
};

const appendClassPipes = (target: any, pipes: PipeLike[]) => {
  const pipeline = getClassPipeline(target);
  pipeline.pipes.push(...pipes);
  setClassPipeline(target, pipeline);
};

const appendMethodMiddlewares = (
  target: any,
  handler: PropertyKey,
  middlewares: MiddlewareLike[]
) => {
  const pipeline = ensureMethodPipeline(target.constructor, handler);
  pipeline.middlewares.push(...middlewares);
};

const appendMethodGuards = (target: any, handler: PropertyKey, guards: GuardLike[]) => {
  const pipeline = ensureMethodPipeline(target.constructor, handler);
  pipeline.guards.push(...guards);
};

const appendMethodPipes = (target: any, handler: PropertyKey, pipes: PipeLike[]) => {
  const pipeline = ensureMethodPipeline(target.constructor, handler);
  pipeline.pipes.push(...pipes);
};

const appendMethodParameter = (
  target: any,
  handler: PropertyKey,
  parameter: RouteParameterMetadata
) => {
  const entries = getMethodParameters(target.constructor);
  let entry = entries.find((candidate) => candidate.handler === handler);
  if (!entry) {
    entry = { handler, parameters: [] };
    entries.push(entry);
  }

  const existing = entry.parameters.find((candidate) => candidate.index === parameter.index);
  if (existing) {
    existing.source = parameter.source;
    existing.property = parameter.property;
    existing.metatype = parameter.metatype;
  } else {
    entry.parameters.push(parameter);
    entry.parameters.sort((left, right) => left.index - right.index);
  }

  setMethodParameters(target.constructor, entries);
};

const routeOptionsFrom = (pathOrOptions: string | RouteOptions | undefined): RouteOptions => {
  if (typeof pathOrOptions === "string") {
    return { path: pathOrOptions };
  }
  return pathOrOptions || {};
};

const buildRouteDecorator = (method: HttpMethod) => {
  return (pathOrOptions: string | RouteOptions = ""): MethodDecorator => {
    const options = routeOptionsFrom(pathOrOptions);
    return (target, propertyKey) => {
      const routes: StoredRouteMetadata[] =
        Reflect.getMetadata(ROUTES_KEY, target.constructor) || [];
      routes.push({
        method,
        path: normalizePath(options.path),
        handler: propertyKey,
      });
      Reflect.defineMetadata(ROUTES_KEY, routes, target.constructor);

      if (options.middlewares?.length) {
        appendMethodMiddlewares(target, propertyKey, options.middlewares);
      }
      if (options.guards?.length) {
        appendMethodGuards(target, propertyKey, options.guards);
      }
      if (options.pipes?.length) {
        appendMethodPipes(target, propertyKey, options.pipes);
      }
    };
  };
};

export function Controller(pathOrOptions: string | ControllerOptions = ""): ClassDecorator {
  const options: ControllerOptions =
    typeof pathOrOptions === "string" ? { path: pathOrOptions } : pathOrOptions;
  return (target) => {
    Reflect.defineMetadata(
      CONTROLLERS_KEY,
      {
        path: normalizePath(options.path),
      },
      target
    );

    if (options.middlewares?.length) {
      appendClassMiddlewares(target, options.middlewares);
    }
    if (options.guards?.length) {
      appendClassGuards(target, options.guards);
    }
    if (options.pipes?.length) {
      appendClassPipes(target, options.pipes);
    }
  };
}

export const Get = buildRouteDecorator("GET");
export const Post = buildRouteDecorator("POST");
export const Patch = buildRouteDecorator("PATCH");
export const Delete = buildRouteDecorator("DELETE");

const buildParameterDecorator = (
  source: RouteParameterSource
): ((property?: string) => ParameterDecorator) => {
  return (property?: string): ParameterDecorator => {
    return (target, propertyKey, parameterIndex) => {
      if (!propertyKey) {
        throw new Error(`${source} parameter decorator can only be used on controller methods`);
      }

      const parameterTypes = Reflect.getMetadata("design:paramtypes", target, propertyKey) as
        | any[]
        | undefined;

      appendMethodParameter(target, propertyKey, {
        index: parameterIndex,
        source,
        property,
        metatype: parameterTypes?.[parameterIndex],
      });
    };
  };
};

export const Body = buildParameterDecorator("body");
export const Query = buildParameterDecorator("query");
export const Param = buildParameterDecorator("param");
export const Req = buildParameterDecorator("request");
export const Res = buildParameterDecorator("response");

export function UseMiddlewares(...middlewares: MiddlewareLike[]): MethodDecorator & ClassDecorator {
  return (target: any, propertyKey?: string | symbol) => {
    if (!propertyKey) {
      appendClassMiddlewares(target, middlewares);
      return;
    }
    appendMethodMiddlewares(target, propertyKey, middlewares);
  };
}

export function UseGuards(...guards: GuardLike[]): MethodDecorator & ClassDecorator {
  return (target: any, propertyKey?: string | symbol) => {
    if (!propertyKey) {
      appendClassGuards(target, guards);
      return;
    }
    appendMethodGuards(target, propertyKey, guards);
  };
}

export function UsePipes(...pipes: PipeLike[]): MethodDecorator & ClassDecorator {
  return (target: any, propertyKey?: string | symbol) => {
    if (!propertyKey) {
      appendClassPipes(target, pipes);
      return;
    }
    appendMethodPipes(target, propertyKey, pipes);
  };
}

export function getControllerMetadata(target: any): ControllerMetadata | undefined {
  const controllerMeta: { path: string } | undefined = Reflect.getMetadata(CONTROLLERS_KEY, target);
  if (!controllerMeta) {
    return undefined;
  }
  const pipeline = getClassPipeline(target);
  return {
    path: controllerMeta.path,
    middlewares: [...pipeline.middlewares],
    guards: [...pipeline.guards],
    pipes: [...pipeline.pipes],
  };
}

export function getRouteMetadata(target: any): RouteMetadata[] {
  const routes: StoredRouteMetadata[] =
    Reflect.getMetadata(ROUTES_KEY, target) || [];
  const methodPipelines = getMethodPipelines(target);
  const methodParameters = getMethodParameters(target);
  return routes.map((route) => {
    const methodPipeline = methodPipelines.find((item) => item.handler === route.handler)?.pipeline;
    const parameters = methodParameters.find((item) => item.handler === route.handler)?.parameters || [];
    return {
      ...route,
      middlewares: [...(methodPipeline?.middlewares || [])],
      guards: [...(methodPipeline?.guards || [])],
      pipes: [...(methodPipeline?.pipes || [])],
      parameters: parameters.map((parameter) => ({ ...parameter })),
    };
  });
}
