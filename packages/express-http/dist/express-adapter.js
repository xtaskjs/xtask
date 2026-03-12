"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressAdapter = void 0;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const SUPPORTED_METHODS = ["GET", "POST", "PATCH", "DELETE"];
const DEFAULT_VIEWS_FOLDER = "views";
const DEFAULT_PUBLIC_FOLDER = "public";
const DEFAULT_FILE_EXTENSION = ".html";
const interpolateTemplate = (template, model) => {
    return template.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key) => {
        const value = key.split(".").reduce((acc, segment) => acc?.[segment], model);
        return value === undefined || value === null ? "" : String(value);
    });
};
const withLeadingDot = (value) => (value.startsWith(".") ? value : `.${value}`);
class ExpressAdapter {
    constructor(app, options) {
        this.type = "express";
        if (!app || typeof app.use !== "function" || typeof app.listen !== "function") {
            throw new Error("ExpressAdapter requires a valid express app instance");
        }
        const templateEngine = options?.templateEngine;
        this.viewsPath = templateEngine?.viewsPath || path_1.default.join(process.cwd(), DEFAULT_VIEWS_FOLDER);
        this.fileExtension = withLeadingDot(templateEngine?.fileExtension || DEFAULT_FILE_EXTENSION);
        if (typeof app.set === "function") {
            app.set("views", this.viewsPath);
        }
        if (templateEngine?.engine && templateEngine.extension && typeof app.engine === "function") {
            app.engine(templateEngine.extension, templateEngine.engine);
        }
        if (templateEngine?.viewEngine && typeof app.set === "function") {
            app.set("view engine", templateEngine.viewEngine);
        }
        const staticFiles = options?.staticFiles;
        if (staticFiles?.enabled !== false) {
            const expressModule = require("express");
            const publicPath = staticFiles?.publicPath || path_1.default.join(process.cwd(), DEFAULT_PUBLIC_FOLDER);
            const urlPrefix = staticFiles?.urlPrefix || "/";
            const staticMiddleware = expressModule.static(publicPath);
            if (urlPrefix === "/") {
                app.use(staticMiddleware);
            }
            else {
                app.use(urlPrefix, staticMiddleware);
            }
        }
        this.templateRenderer = templateEngine?.render;
        this.hasNativeViewEngine = Boolean(templateEngine?.viewEngine || templateEngine?.engine);
        this.app = app;
    }
    async renderFileTemplate(template, model) {
        const fullTemplateName = path_1.default.extname(template) ? template : `${template}${this.fileExtension}`;
        const templatePath = path_1.default.join(this.viewsPath, fullTemplateName);
        const templateFile = await (0, promises_1.readFile)(templatePath, "utf-8");
        return interpolateTemplate(templateFile, model);
    }
    registerRequestHandler(handler) {
        this.app.use(async (req, res) => {
            const method = (req.method || "GET").toUpperCase();
            if (!SUPPORTED_METHODS.includes(method)) {
                res.status(405).send("Method Not Allowed");
                return;
            }
            const path = req.path || req.url || "/";
            await handler(method, path, req, res);
        });
    }
    async listen(options) {
        await new Promise((resolve, reject) => {
            this.closeServer = this.app.listen(options.port, options.host, (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }
    async renderView(req, res, payload) {
        if (payload.statusCode && typeof res.status === "function") {
            res.status(payload.statusCode);
        }
        else if (payload.statusCode) {
            res.statusCode = payload.statusCode;
        }
        if (this.templateRenderer) {
            const html = await this.templateRenderer(payload.template, payload.model || {}, { req, res });
            if (typeof res.send === "function") {
                res.send(html);
                return;
            }
            res.setHeader?.("content-type", "text/html; charset=utf-8");
            res.end?.(html);
            return;
        }
        if (this.hasNativeViewEngine && typeof res.render === "function") {
            await new Promise((resolve, reject) => {
                res.render(payload.template, payload.model || {}, (error, html) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    if (html !== undefined) {
                        if (typeof res.send === "function") {
                            res.send(html);
                        }
                        else {
                            res.setHeader?.("content-type", "text/html; charset=utf-8");
                            res.end?.(html);
                        }
                    }
                    resolve();
                });
            });
            return;
        }
        const html = await this.renderFileTemplate(payload.template, payload.model || {});
        if (typeof res.send === "function") {
            res.send(html);
            return;
        }
        res.setHeader?.("content-type", "text/html; charset=utf-8");
        res.end?.(html);
        return;
    }
    async close() {
        if (!this.closeServer) {
            return;
        }
        await new Promise((resolve, reject) => {
            this.closeServer.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
        this.closeServer = undefined;
    }
}
exports.ExpressAdapter = ExpressAdapter;
