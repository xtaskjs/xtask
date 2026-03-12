"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Delete = exports.Patch = exports.Post = exports.Get = void 0;
exports.Controller = Controller;
exports.UseMiddlewares = UseMiddlewares;
exports.UseGuards = UseGuards;
exports.UsePipes = UsePipes;
exports.getControllerMetadata = getControllerMetadata;
exports.getRouteMetadata = getRouteMetadata;
const constants_1 = require("./constants");
const emptyPipeline = () => ({
    middlewares: [],
    guards: [],
    pipes: [],
});
const normalizePath = (value) => {
    const source = (value || "").trim();
    if (!source || source === "/") {
        return "";
    }
    const withLeadingSlash = source.startsWith("/") ? source : `/${source}`;
    return withLeadingSlash.endsWith("/")
        ? withLeadingSlash.slice(0, -1)
        : withLeadingSlash;
};
const getClassPipeline = (target) => {
    const meta = Reflect.getMetadata(constants_1.CLASS_PIPELINE_KEY, target);
    return meta || emptyPipeline();
};
const setClassPipeline = (target, pipeline) => {
    Reflect.defineMetadata(constants_1.CLASS_PIPELINE_KEY, pipeline, target);
};
const getMethodPipelines = (target) => {
    const entries = Reflect.getMetadata(constants_1.METHOD_PIPELINES_KEY, target);
    return entries || [];
};
const setMethodPipelines = (target, entries) => {
    Reflect.defineMetadata(constants_1.METHOD_PIPELINES_KEY, entries, target);
};
const ensureMethodPipeline = (target, handler) => {
    const entries = getMethodPipelines(target);
    let entry = entries.find((candidate) => candidate.handler === handler);
    if (!entry) {
        entry = { handler, pipeline: emptyPipeline() };
        entries.push(entry);
        setMethodPipelines(target, entries);
    }
    return entry.pipeline;
};
const appendClassMiddlewares = (target, middlewares) => {
    const pipeline = getClassPipeline(target);
    pipeline.middlewares.push(...middlewares);
    setClassPipeline(target, pipeline);
};
const appendClassGuards = (target, guards) => {
    const pipeline = getClassPipeline(target);
    pipeline.guards.push(...guards);
    setClassPipeline(target, pipeline);
};
const appendClassPipes = (target, pipes) => {
    const pipeline = getClassPipeline(target);
    pipeline.pipes.push(...pipes);
    setClassPipeline(target, pipeline);
};
const appendMethodMiddlewares = (target, handler, middlewares) => {
    const pipeline = ensureMethodPipeline(target.constructor, handler);
    pipeline.middlewares.push(...middlewares);
};
const appendMethodGuards = (target, handler, guards) => {
    const pipeline = ensureMethodPipeline(target.constructor, handler);
    pipeline.guards.push(...guards);
};
const appendMethodPipes = (target, handler, pipes) => {
    const pipeline = ensureMethodPipeline(target.constructor, handler);
    pipeline.pipes.push(...pipes);
};
const routeOptionsFrom = (pathOrOptions) => {
    if (typeof pathOrOptions === "string") {
        return { path: pathOrOptions };
    }
    return pathOrOptions || {};
};
const buildRouteDecorator = (method) => {
    return (pathOrOptions = "") => {
        const options = routeOptionsFrom(pathOrOptions);
        return (target, propertyKey) => {
            const routes = Reflect.getMetadata(constants_1.ROUTES_KEY, target.constructor) || [];
            routes.push({
                method,
                path: normalizePath(options.path),
                handler: propertyKey,
            });
            Reflect.defineMetadata(constants_1.ROUTES_KEY, routes, target.constructor);
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
function Controller(pathOrOptions = "") {
    const options = typeof pathOrOptions === "string" ? { path: pathOrOptions } : pathOrOptions;
    return (target) => {
        Reflect.defineMetadata(constants_1.CONTROLLERS_KEY, {
            path: normalizePath(options.path),
        }, target);
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
exports.Get = buildRouteDecorator("GET");
exports.Post = buildRouteDecorator("POST");
exports.Patch = buildRouteDecorator("PATCH");
exports.Delete = buildRouteDecorator("DELETE");
function UseMiddlewares(...middlewares) {
    return (target, propertyKey) => {
        if (!propertyKey) {
            appendClassMiddlewares(target, middlewares);
            return;
        }
        appendMethodMiddlewares(target, propertyKey, middlewares);
    };
}
function UseGuards(...guards) {
    return (target, propertyKey) => {
        if (!propertyKey) {
            appendClassGuards(target, guards);
            return;
        }
        appendMethodGuards(target, propertyKey, guards);
    };
}
function UsePipes(...pipes) {
    return (target, propertyKey) => {
        if (!propertyKey) {
            appendClassPipes(target, pipes);
            return;
        }
        appendMethodPipes(target, propertyKey, pipes);
    };
}
function getControllerMetadata(target) {
    const controllerMeta = Reflect.getMetadata(constants_1.CONTROLLERS_KEY, target);
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
function getRouteMetadata(target) {
    const routes = Reflect.getMetadata(constants_1.ROUTES_KEY, target) || [];
    const methodPipelines = getMethodPipelines(target);
    return routes.map((route) => {
        const methodPipeline = methodPipelines.find((item) => item.handler === route.handler)?.pipeline;
        return {
            ...route,
            middlewares: [...(methodPipeline?.middlewares || [])],
            guards: [...(methodPipeline?.guards || [])],
            pipes: [...(methodPipeline?.pipes || [])],
        };
    });
}
