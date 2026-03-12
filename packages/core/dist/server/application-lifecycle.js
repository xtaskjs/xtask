"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationLifeCycle = void 0;
const os = __importStar(require("os"));
const process = __importStar(require("process"));
class ApplicationLifeCycle {
    constructor() {
        this.listeners = new Map();
        this.runners = [];
        this.controllerRoutes = [];
    }
    on(event, Listener, priority = 0) {
        const list = this.listeners.get(event) || [];
        list.push({ fn: Listener, priority });
        this.listeners.set(event, list.sort((a, b) => b.priority - a.priority));
    }
    registerRunner(fn, type = "ApplicationRunner", priority = 0) {
        this.runners.push({ fn, type, priority });
        this.runners.sort((a, b) => b.priority - a.priority);
    }
    registerControllerRoute(route) {
        this.controllerRoutes.push(route);
    }
    getControllerRoutes() {
        return [...this.controllerRoutes];
    }
    async runGuard(guard, context) {
        if (typeof guard === "function") {
            return Promise.resolve(guard(context));
        }
        return Promise.resolve(guard.canActivate(context));
    }
    async runPipe(pipe, value, context) {
        if (typeof pipe === "function") {
            return Promise.resolve(pipe(value, context));
        }
        return Promise.resolve(pipe.transform(value, context));
    }
    async runMiddleware(middleware, context, next) {
        if (typeof middleware === "function") {
            return Promise.resolve(middleware(context, next));
        }
        return Promise.resolve(middleware.use(context, next));
    }
    async dispatchControllerRoute(method, path, ...args) {
        const route = this.controllerRoutes.find((candidate) => candidate.method === method && candidate.path === path);
        if (!route) {
            throw new Error(`No route registered for ${method} ${path}`);
        }
        const context = {
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
        const executeMiddleware = async (index) => {
            if (index >= route.middlewares.length) {
                return executeRoute();
            }
            const middleware = route.middlewares[index];
            return this.runMiddleware(middleware, context, () => executeMiddleware(index + 1));
        };
        return executeMiddleware(0);
    }
    async emit(event, payload) {
        const list = this.listeners.get(event) || [];
        for (const { fn, priority } of list) {
            try {
                await Promise.resolve(fn(payload));
            }
            catch (error) {
                console.error(`Error in lifecycle handler for phase ${event} (priority ${priority}):`, error);
                if (event != "error") {
                    await this.emit("error", error);
                }
            }
        }
    }
    async runRunners(type) {
        for (const runner of this.runners.filter(r => r.type === type)) {
            await Promise.resolve(runner.fn(process.argv.slice(2)));
        }
    }
    async boot(startFn) {
        try {
            await this.emit("starting");
            await this.emit("environmentPrepared", { env: process.env, args: process.argv });
            await this.emit("contextPrepared");
            await this.emit("serverStarting");
            await startFn();
            await this.emit("serverStarted");
            this.metricsInterval = setInterval(async () => {
                await this.emit("memoryReport", process.memoryUsage());
                await this.emit("cpuReport", {
                    loadavg: os.loadavg(),
                    usage: process.cpuUsage()
                });
            }, 5000); //every minute
            await this.runRunners("ApplicationRunner");
            await this.emit("ready");
            await this.runRunners("CommandLineRunner");
        }
        catch (error) {
            await this.emit("error", error);
            throw error;
        }
    }
    async stop() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = undefined;
        }
        this.controllerRoutes = [];
    }
}
exports.ApplicationLifeCycle = ApplicationLifeCycle;
