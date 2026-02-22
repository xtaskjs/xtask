import {
    GuardLike,
    HttpMethod,
    LifeCyclePhase,
    MiddlewareLike,
    PipeLike,
    RouteExecutionContext,
} from "@xtaskjs/common";
import *  as os from "os";
import * as process from "process";

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
    action: (...args: any[]) => any | Promise<any>;
}

export class ApplicationLifeCycle {
    private listeners: Map<LifeCyclePhase, Listener[]> = new Map();
    private metricsInterval?: NodeJS.Timeout;
    private runners : { type: "ApplicationRunner" | "CommandLineRunner"; priority:number; fn:(args?:string[]) => any }[] = [];
    private controllerRoutes: ControllerRoute[] = [];

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

    public async dispatchControllerRoute(method: HttpMethod, path: string, ...args: any[]) {
        const route = this.controllerRoutes.find(
            (candidate) => candidate.method === method && candidate.path === path
        );

        if (!route) {
            throw new Error(`No route registered for ${method} ${path}`);
        }

        const context: RouteExecutionContext = {
            method,
            path,
            args,
            controller: route.controller,
            handler: route.handler,
        };

        for (const guard of route.guards) {
            const canActivate = await this.runGuard(guard, context);
            if (!canActivate) {
                throw new Error(`Route blocked by guard: ${method} ${path}`);
            }
        }

        let transformedArgs = [...args];
        for (const pipe of route.pipes) {
            const nextArgs = [];
            for (const arg of transformedArgs) {
                nextArgs.push(await this.runPipe(pipe, arg, context));
            }
            transformedArgs = nextArgs;
        }

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
    }

}