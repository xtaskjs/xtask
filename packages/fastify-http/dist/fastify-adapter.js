"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FastifyAdapter = void 0;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const SUPPORTED_METHODS = ["GET", "POST", "PATCH", "DELETE"];
const DEFAULT_VIEWS_FOLDER = "views";
const DEFAULT_PUBLIC_FOLDER = "public";
const DEFAULT_FILE_EXTENSION = ".html";
const withLeadingSlash = (value) => {
    if (!value) {
        return "/";
    }
    return value.startsWith("/") ? value : `/${value}`;
};
const withLeadingDot = (value) => (value.startsWith(".") ? value : `.${value}`);
const interpolateTemplate = (template, model) => {
    return template.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key) => {
        const value = key.split(".").reduce((acc, segment) => acc?.[segment], model);
        return value === undefined || value === null ? "" : String(value);
    });
};
const getContentType = (filePath) => {
    const extension = path_1.default.extname(filePath).toLowerCase();
    const contentTypes = {
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".webp": "image/webp",
    };
    return contentTypes[extension] || "application/octet-stream";
};
class FastifyAdapter {
    constructor(app, options) {
        this.type = "fastify";
        if (!app || typeof app.route !== "function" || typeof app.listen !== "function") {
            throw new Error("FastifyAdapter requires a valid fastify instance");
        }
        const templateEngine = options?.templateEngine;
        const staticFiles = options?.staticFiles;
        this.templateRenderer = templateEngine?.render;
        this.nativeTemplateRenderer = templateEngine?.nativeRender;
        this.viewsPath = templateEngine?.viewsPath || path_1.default.join(process.cwd(), DEFAULT_VIEWS_FOLDER);
        this.fileExtension = withLeadingDot(templateEngine?.fileExtension || DEFAULT_FILE_EXTENSION);
        this.resolvedViewsPath = path_1.default.resolve(this.viewsPath);
        this.staticEnabled = staticFiles?.enabled !== false;
        this.publicPath = staticFiles?.publicPath || path_1.default.join(process.cwd(), DEFAULT_PUBLIC_FOLDER);
        this.publicPrefix = withLeadingSlash(staticFiles?.urlPrefix || "/");
        this.resolvedPublicPath = path_1.default.resolve(this.publicPath);
        this.app = app;
    }
    async renderFileTemplate(template, model) {
        const fullTemplateName = path_1.default.extname(template) ? template : `${template}${this.fileExtension}`;
        const templatePath = path_1.default.resolve(path_1.default.join(this.viewsPath, fullTemplateName));
        if (!templatePath.startsWith(this.resolvedViewsPath)) {
            throw new Error("Template path is outside configured views directory");
        }
        const templateFile = await (0, promises_1.readFile)(templatePath, "utf-8");
        return interpolateTemplate(templateFile, model);
    }
    async tryServeStatic(request, reply) {
        if (!this.staticEnabled) {
            return false;
        }
        const method = String(request?.method || "GET").toUpperCase();
        if (method !== "GET") {
            return false;
        }
        const rawUrl = String(request?.url || "/");
        const pathname = new URL(rawUrl, "http://localhost").pathname;
        if (this.publicPrefix !== "/" && !pathname.startsWith(this.publicPrefix)) {
            return false;
        }
        const relativePath = this.publicPrefix === "/" ? pathname : pathname.slice(this.publicPrefix.length);
        if (!relativePath || relativePath === "/") {
            return false;
        }
        const decodedRelativePath = decodeURIComponent(relativePath);
        const staticFilePath = path_1.default.resolve(path_1.default.join(this.publicPath, decodedRelativePath));
        if (!staticFilePath.startsWith(this.resolvedPublicPath)) {
            return false;
        }
        try {
            await (0, promises_1.access)(staticFilePath);
            const content = await (0, promises_1.readFile)(staticFilePath);
            if (typeof reply.header === "function") {
                reply.header("content-type", getContentType(staticFilePath));
            }
            reply.send(content);
            return true;
        }
        catch {
            return false;
        }
    }
    createResponseProxy(reply) {
        const proxy = {
            get statusCode() {
                return reply.statusCode;
            },
            set statusCode(code) {
                if (typeof code === "number") {
                    reply.code(code);
                }
            },
            get headersSent() {
                return Boolean(reply.sent);
            },
            setHeader(name, value) {
                reply.header(name, value);
            },
            end(chunk) {
                reply.send(chunk);
            },
            json(payload) {
                reply.send(payload);
            },
            send(payload) {
                reply.send(payload);
            },
            status(code) {
                reply.code(code);
                return proxy;
            },
            code(code) {
                reply.code(code);
                return proxy;
            },
            header(name, value) {
                reply.header(name, value);
                return proxy;
            },
        };
        if (typeof reply.view === "function") {
            proxy.view = (template, locals) => {
                return reply.view(template, locals);
            };
        }
        return proxy;
    }
    registerRequestHandler(handler) {
        this.app.route({
            method: ["GET", "POST", "PATCH", "DELETE"],
            url: "*",
            handler: async (request, reply) => {
                if (await this.tryServeStatic(request, reply)) {
                    return;
                }
                const method = (request.method || "GET").toUpperCase();
                if (!SUPPORTED_METHODS.includes(method)) {
                    reply.code(405).send("Method Not Allowed");
                    return;
                }
                const path = request.url || "/";
                const response = this.createResponseProxy(reply);
                await handler(method, path, request, response);
            },
        });
    }
    async listen(options) {
        await this.app.listen({ port: options.port, host: options.host });
    }
    async renderView(req, res, payload) {
        if (payload.statusCode && typeof res.code === "function") {
            res.code(payload.statusCode);
        }
        else if (payload.statusCode && typeof res.status === "function") {
            res.status(payload.statusCode);
        }
        else if (payload.statusCode) {
            res.statusCode = payload.statusCode;
        }
        if (this.templateRenderer) {
            const html = await this.templateRenderer(payload.template, payload.model || {}, { req, res });
            if (typeof res.header === "function") {
                res.header("content-type", "text/html; charset=utf-8");
            }
            res.send?.(html);
            return;
        }
        if (this.nativeTemplateRenderer) {
            const output = await this.nativeTemplateRenderer(res, payload.template, payload.model || {});
            if (typeof output === "string") {
                if (typeof res.header === "function") {
                    res.header("content-type", "text/html; charset=utf-8");
                }
                res.send?.(output);
            }
            return;
        }
        if (typeof res.view === "function") {
            const output = await res.view(payload.template, payload.model || {});
            if (typeof output === "string") {
                if (typeof res.header === "function") {
                    res.header("content-type", "text/html; charset=utf-8");
                }
                res.send?.(output);
            }
            return;
        }
        const html = await this.renderFileTemplate(payload.template, payload.model || {});
        if (typeof res.header === "function") {
            res.header("content-type", "text/html; charset=utf-8");
        }
        res.send?.(html);
    }
    async close() {
        await this.app.close();
    }
}
exports.FastifyAdapter = FastifyAdapter;
