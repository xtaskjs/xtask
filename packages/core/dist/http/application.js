"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XTaskHttpApplication = void 0;
exports.createHttpAdapter = createHttpAdapter;
exports.registerContainerInLifecycle = registerContainerInLifecycle;
const di_1 = require("../di");
const node_http_adapter_1 = require("./node-http-adapter");
const defaultServerOptions = {
    host: "127.0.0.1",
    port: 3000,
};
const normalizeServerOptions = (options) => ({
    host: options?.host || defaultServerOptions.host,
    port: options?.port || defaultServerOptions.port,
});
const toDisplayHost = (host) => {
    if (host === "0.0.0.0" || host === "::") {
        return "localhost";
    }
    return host;
};
const normalizePath = (value) => {
    if (!value || value === "/") {
        return "/";
    }
    return value.endsWith("/") && value.length > 1 ? value.slice(0, -1) : value;
};
const isRouteNotFoundError = (error) => {
    return typeof error?.message === "string" && error.message.startsWith("No route registered for");
};
const isViewResult = (payload) => {
    return payload?.__xtaskView === true && typeof payload?.template === "string";
};
const resolveExpressAdapter = () => {
    try {
        const expressHttpPackage = require("@xtaskjs/express-http");
        if (typeof expressHttpPackage.ExpressAdapter !== "function") {
            throw new Error("@xtaskjs/express-http does not export ExpressAdapter");
        }
        return expressHttpPackage.ExpressAdapter;
    }
    catch (error) {
        const missingPackage = error?.code === "MODULE_NOT_FOUND" ||
            String(error?.message || "").includes("@xtaskjs/express-http");
        if (missingPackage) {
            throw new Error("express adapter requires @xtaskjs/express-http. Install it with: npm install @xtaskjs/express-http");
        }
        throw error;
    }
};
const resolveFastifyAdapter = () => {
    try {
        const fastifyHttpPackage = require("@xtaskjs/fastify-http");
        if (typeof fastifyHttpPackage.FastifyAdapter !== "function") {
            throw new Error("@xtaskjs/fastify-http does not export FastifyAdapter");
        }
        return fastifyHttpPackage.FastifyAdapter;
    }
    catch (error) {
        const missingPackage = error?.code === "MODULE_NOT_FOUND" ||
            String(error?.message || "").includes("@xtaskjs/fastify-http");
        if (missingPackage) {
            throw new Error("fastify adapter requires @xtaskjs/fastify-http. Install it with: npm install @xtaskjs/fastify-http");
        }
        throw error;
    }
};
const resolveTypeOrmInitialize = () => {
    try {
        const typeormPackage = require("@xtaskjs/typeorm");
        if (typeof typeormPackage.initializeTypeOrmIntegration === "function") {
            return typeormPackage.initializeTypeOrmIntegration;
        }
    }
    catch (error) {
        const missingPackage = error?.code === "MODULE_NOT_FOUND" ||
            String(error?.message || "").includes("@xtaskjs/typeorm");
        if (!missingPackage) {
            throw error;
        }
    }
    return undefined;
};
const resolveTypeOrmShutdown = () => {
    try {
        const typeormPackage = require("@xtaskjs/typeorm");
        if (typeof typeormPackage.shutdownTypeOrmIntegration === "function") {
            return typeormPackage.shutdownTypeOrmIntegration;
        }
    }
    catch (error) {
        const missingPackage = error?.code === "MODULE_NOT_FOUND" ||
            String(error?.message || "").includes("@xtaskjs/typeorm");
        if (!missingPackage) {
            throw error;
        }
    }
    return undefined;
};
class XTaskHttpApplication {
    constructor(params) {
        this.adapter = params.adapter;
        this.lifecycle = params.lifecycle;
        this.kernel = params.kernel;
        this.adapter.registerRequestHandler(this.dispatchRequest.bind(this));
    }
    async dispatchRequest(method, path, req, res) {
        try {
            const result = await this.lifecycle.dispatchControllerRoute(method, normalizePath(path), req, res);
            if (res.headersSent) {
                return;
            }
            if (result === undefined) {
                res.statusCode = 204;
                res.end?.();
                return;
            }
            if (isViewResult(result)) {
                if (this.adapter.renderView) {
                    await this.adapter.renderView(req, res, result);
                    return;
                }
                throw new Error(`Adapter '${this.adapter.type}' does not support view rendering. Configure a template engine in the selected adapter.`);
            }
            if (typeof result === "object") {
                if (typeof res.json === "function") {
                    res.json(result);
                    return;
                }
                res.statusCode = res.statusCode || 200;
                res.setHeader?.("content-type", "application/json");
                res.end?.(JSON.stringify(result));
                return;
            }
            res.statusCode = res.statusCode || 200;
            if (typeof res.send === "function") {
                res.send(result);
                return;
            }
            res.end?.(String(result));
        }
        catch (error) {
            if (res.headersSent) {
                return;
            }
            if (isRouteNotFoundError(error)) {
                if (typeof res.status === "function" && typeof res.send === "function") {
                    res.status(404).send("Not Found");
                    return;
                }
                res.statusCode = 404;
                res.end?.("Not Found");
                return;
            }
            if (typeof res.status === "function" && typeof res.json === "function") {
                res.status(500).json({ message: "Internal Server Error", error: error?.message });
                return;
            }
            res.statusCode = 500;
            res.setHeader?.("content-type", "application/json");
            res.end?.(JSON.stringify({ message: "Internal Server Error", error: error?.message }));
        }
    }
    async listen(options) {
        const serverOptions = normalizeServerOptions(options);
        await this.adapter.listen(serverOptions);
        if (process.env.NODE_ENV !== "test") {
            const displayHost = toDisplayHost(serverOptions.host);
            const url = `http://${displayHost}:${serverOptions.port}`;
            console.log(`[HTTP] Server started | adapter=${this.adapter.type} | url=${url}`);
        }
    }
    async close() {
        await this.lifecycle.emit("stopping");
        await this.adapter.close();
        await this.lifecycle.stop();
        const shutdownTypeOrmIntegration = resolveTypeOrmShutdown();
        if (shutdownTypeOrmIntegration) {
            await shutdownTypeOrmIntegration();
        }
        const container = await this.kernel.getContainer();
        container.destroy();
        (0, di_1.clearCurrentContainer)();
        await this.lifecycle.emit("stopped");
    }
    getKernel() {
        return this.kernel;
    }
    getLifecycle() {
        return this.lifecycle;
    }
}
exports.XTaskHttpApplication = XTaskHttpApplication;
function createHttpAdapter(adapter = "node-http", adapterInstance) {
    if (typeof adapter !== "string") {
        return adapter;
    }
    if (adapter === "node-http") {
        return new node_http_adapter_1.NodeHttpAdapter();
    }
    if (!adapterInstance) {
        throw new Error(`${adapter} adapter requires 'adapterInstance' in CreateApplicationOptions`);
    }
    if (adapter === "express") {
        const ExpressAdapter = resolveExpressAdapter();
        return new ExpressAdapter(adapterInstance);
    }
    if (adapter === "fastify") {
        const FastifyAdapter = resolveFastifyAdapter();
        return new FastifyAdapter(adapterInstance);
    }
    throw new Error(`Unsupported adapter type: ${adapter}`);
}
async function registerContainerInLifecycle(kernel, lifecycle) {
    const container = await kernel.getContainer();
    (0, di_1.setCurrentContainer)(container);
    const initializeTypeOrmIntegration = resolveTypeOrmInitialize();
    if (initializeTypeOrmIntegration) {
        await initializeTypeOrmIntegration(container);
    }
    container.registerLifeCycleListeners(lifecycle);
}
