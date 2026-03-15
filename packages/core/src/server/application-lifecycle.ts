import {
    GuardLike,
    HttpMethod,
    LifeCyclePhase,
    MiddlewareLike,
    PipeLike,
    RouteParameterMetadata,
    RouteExecutionContext,
} from "@xtaskjs/common";
import *  as os from "os";
import * as process from "process";

const INTERNAL_STATE_KEYS = {
    argumentIndex: "__xtaskArgumentIndex",
    routeParameters: "__xtaskRouteParameters",
} as const;

const normalizePath = (value: string): string => {
    if (!value || value === "/") {
        return "/";
    }

    const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
    return withLeadingSlash.endsWith("/") && withLeadingSlash.length > 1
        ? withLeadingSlash.slice(0, -1)
        : withLeadingSlash;
};

const splitPath = (value: string): string[] => {
    const normalizedValue = normalizePath(value);
    if (normalizedValue === "/") {
        return [];
    }
    return normalizedValue.split("/").filter(Boolean);
};

const matchRoutePath = (
    routePath: string,
    requestPath: string
): Record<string, string> | undefined => {
    const routeSegments = splitPath(routePath);
    const requestSegments = splitPath(requestPath);

    if (routeSegments.length !== requestSegments.length) {
        return undefined;
    }

    const params: Record<string, string> = {};

    for (let index = 0; index < routeSegments.length; index += 1) {
        const routeSegment = routeSegments[index];
        const requestSegment = requestSegments[index];

        if (routeSegment.startsWith(":")) {
            params[routeSegment.slice(1)] = decodeURIComponent(requestSegment);
            continue;
        }

        if (routeSegment !== requestSegment) {
            return undefined;
        }
    }

    return params;
};

interface Listener{
    fn: (...args: any[]) => any | Promise<any>;
    priority:number;
}

interface ControllerRoute {
    method: HttpMethod;
    path: string;
    controller: any;
    handler: PropertyKey;
    middlewares: MiddlewareLike[];
    guards: GuardLike[];
    pipes: PipeLike[];
    parameters: RouteParameterMetadata[];
    action: (...args: any[]) => any | Promise<any>;
}

export class ApplicationLifeCycle {
    private listeners: Map<LifeCyclePhase, Listener[]> = new Map();
    private metricsInterval?: NodeJS.Timeout;
    private runners : { type: "ApplicationRunner" | "CommandLineRunner"; priority:number; fn:(args?:string[]) => any }[] = [];
    private controllerRoutes: ControllerRoute[] = [];
    private globalPipes: PipeLike[] = [];

    constructor() {}

    public on(event: LifeCyclePhase, Listener: (...args: any[]) => any | Promise<any>, priority = 0) {
    const list = this.listeners.get(event) || [];
    list.push({ fn: Listener, priority });
    this.listeners.set(event, list.sort((a, b) => b.priority - a.priority));
    }

    public registerRunner(fn: (args?:string[]) => any, type: "ApplicationRunner" | "CommandLineRunner" = "ApplicationRunner", priority = 0) {
        this.runners.push({ fn, type, priority});
        this.runners.sort((a,b) => b.priority - a.priority);
    }

    public registerControllerRoute(route: ControllerRoute) {
        this.controllerRoutes.push(route);
    }

    public useGlobalPipes(...pipes: PipeLike[]) {
        this.globalPipes.push(...pipes);
    }

    public getControllerRoutes() {
        return [...this.controllerRoutes];
    }

    private async runGuard(guard: GuardLike, context: RouteExecutionContext): Promise<boolean> {
        if (typeof guard === "function") {
            return Promise.resolve(guard(context));
        }
        return Promise.resolve(guard.canActivate(context));
    }

    private async runPipe(pipe: PipeLike, value: any, context: RouteExecutionContext): Promise<any> {
        if (typeof pipe === "function") {
            return Promise.resolve(pipe(value, context));
        }
        return Promise.resolve(pipe.transform(value, context));
    }

    private async runMiddleware(
        middleware: MiddlewareLike,
        context: RouteExecutionContext,
        next: () => Promise<any>
    ): Promise<any> {
        if (typeof middleware === "function") {
            return Promise.resolve(middleware(context, next));
        }
        return Promise.resolve(middleware.use(context, next));
    }

    private resolveRouteParameter(
        parameter: RouteParameterMetadata,
        context: RouteExecutionContext
    ): any {
        const request = context.request as any;

        if (parameter.source === "request") {
            return request;
        }

        if (parameter.source === "response") {
            return context.response;
        }

        const sourceValue = parameter.source === "body"
            ? request?.body
            : parameter.source === "query"
                ? request?.query
                : request?.params;

        if (parameter.property) {
            return sourceValue?.[parameter.property];
        }

        return sourceValue;
    }

    private resolveRouteArguments(
        route: ControllerRoute,
        context: RouteExecutionContext,
        args: any[]
    ): any[] {
        if (!route.parameters.length) {
            return [...args];
        }

        const maxParameterIndex = route.parameters.reduce(
            (currentMax, parameter) => Math.max(currentMax, parameter.index),
            -1
        );
        const totalArguments = Math.max(args.length, maxParameterIndex + 1);
        const resolvedArgs = Array.from({ length: totalArguments }, (_, index) => args[index]);

        for (const parameter of route.parameters) {
            resolvedArgs[parameter.index] = this.resolveRouteParameter(parameter, context);
        }

        return resolvedArgs;
    }

    public async dispatchControllerRoute(method: HttpMethod, path: string, ...args: any[]) {
        const normalizedPath = normalizePath(path);
        const matchedRoute = this.controllerRoutes
            .filter((candidate) => candidate.method === method)
            .map((candidate) => ({
                route: candidate,
                params: matchRoutePath(candidate.path, normalizedPath),
            }))
            .find((candidate) => candidate.params !== undefined);

        const route = matchedRoute?.route;

        if (!route) {
            throw new Error(`No route registered for ${method} ${normalizedPath}`);
        }

        const request = args[0] as any;
        if (request && typeof request === "object") {
            request.params = matchedRoute?.params || {};
        }

        const context: RouteExecutionContext = {
            method,
            path: normalizedPath,
            args,
            controller: route.controller,
            handler: route.handler,
            request,
            response: args[1],
            state: {},
            auth: {
                isAuthenticated: false,
                roles: [],
            },
        };

        for (const guard of route.guards) {
            const canActivate = await this.runGuard(guard, context);
            if (!canActivate) {
                throw new Error(`Route blocked by guard: ${method} ${path}`);
            }
        }

        context.state[INTERNAL_STATE_KEYS.routeParameters] = route.parameters.map((parameter) => ({
            ...parameter,
        }));

        let transformedArgs = this.resolveRouteArguments(route, context, args);
        for (const pipe of [...this.globalPipes, ...route.pipes]) {
            const nextArgs = [];
            for (let index = 0; index < transformedArgs.length; index += 1) {
                context.state[INTERNAL_STATE_KEYS.argumentIndex] = index;
                const arg = transformedArgs[index];
                nextArgs.push(await this.runPipe(pipe, arg, context));
            }
            transformedArgs = nextArgs;
        }

        delete context.state[INTERNAL_STATE_KEYS.argumentIndex];
        delete context.state[INTERNAL_STATE_KEYS.routeParameters];

        context.args = transformedArgs;

        const executeRoute = async () => Promise.resolve(route.action(...context.args));

        const executeMiddleware = async (index: number): Promise<any> => {
            if (index >= route.middlewares.length) {
                return executeRoute();
            }
            const middleware = route.middlewares[index];
            return this.runMiddleware(middleware, context, () => executeMiddleware(index + 1));
        };

        return executeMiddleware(0);
    }
    
    public async emit(event: LifeCyclePhase, payload?:any) {
        const list = this.listeners.get(event) || [];
        for (const { fn, priority } of list) {
            try {
                await Promise.resolve(fn(payload));
            } catch(error) {
                console.error(`Error in lifecycle handler for phase ${event} (priority ${priority}):`, error);
                if (event !="error"){
                    await this.emit("error", error);
                }
            }
        }
    }

    public async runRunners(type: "ApplicationRunner" | "CommandLineRunner") {
        for (const runner of this.runners.filter(r => r.type === type)) {
            await Promise.resolve(runner.fn(process.argv.slice(2)));
        }
    }

    public async boot(startFn: () => Promise<void>) {
       try{
            await this.emit("starting");
            await this.emit("environmentPrepared", { env: process.env, args: process.argv });
            await this.emit("contextPrepared");
            
            await this.emit("serverStarting");

            await startFn();

            await this.emit("serverStarted");

            this.metricsInterval = setInterval(async() => {
                await this.emit("memoryReport", process.memoryUsage());
                await this.emit("cpuReport",{
                    loadavg:os.loadavg(),
                    usage: process.cpuUsage()
                });
            }, 5000); //every minute
            
            await this.runRunners("ApplicationRunner");
            await this.emit("ready");
            await this.runRunners("CommandLineRunner");
        } catch (error){
            await this.emit("error", error);
            throw error;
        }
            
    }

    public async stop() {
        if(this.metricsInterval){
            clearInterval(this.metricsInterval);
            this.metricsInterval = undefined;
        }
        this.controllerRoutes = [];
        this.globalPipes = [];
    }

}