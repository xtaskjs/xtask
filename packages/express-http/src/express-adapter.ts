import { HttpMethod } from "@xtaskjs/common";
import {
  ExpressAdapterOptions,
  HttpAdapter,
  HttpRequestHandler,
  HttpRequestLike,
  HttpResponseLike,
  HttpServerOptions,
  HttpViewResult,
} from "./types";
import { readFile } from "fs/promises";
import path from "path";

const SUPPORTED_METHODS: HttpMethod[] = ["GET", "POST", "PATCH", "DELETE"];
const DEFAULT_VIEWS_FOLDER = "views";
const DEFAULT_PUBLIC_FOLDER = "public";
const DEFAULT_FILE_EXTENSION = ".html";

const appendQueryValue = (
  target: Record<string, any>,
  key: string,
  value: string
) => {
  const existingValue = target[key];
  if (existingValue === undefined) {
    target[key] = value;
    return;
  }

  if (Array.isArray(existingValue)) {
    existingValue.push(value);
    return;
  }

  target[key] = [existingValue, value];
};

const toQueryObject = (url: URL): Record<string, any> => {
  const query: Record<string, any> = {};
  for (const [key, value] of url.searchParams.entries()) {
    appendQueryValue(query, key, value);
  }
  return query;
};

const createNormalizedRequest = (req: any, path: string, parsedUrl: URL): HttpRequestLike => {
  const normalizedRequest = Object.create(req);
  Object.defineProperties(normalizedRequest, {
    path: {
      value: path,
      enumerable: true,
      configurable: true,
      writable: true,
    },
    query: {
      value: req.query || toQueryObject(parsedUrl),
      enumerable: true,
      configurable: true,
      writable: true,
    },
    params: {
      value: req.params || {},
      enumerable: true,
      configurable: true,
      writable: true,
    },
    body: {
      value: req.body,
      enumerable: true,
      configurable: true,
      writable: true,
    },
    url: {
      value: req.url,
      enumerable: true,
      configurable: true,
      writable: true,
    },
    method: {
      value: req.method,
      enumerable: true,
      configurable: true,
      writable: true,
    },
    headers: {
      value: req.headers,
      enumerable: true,
      configurable: true,
      writable: true,
    },
  });
  return normalizedRequest;
};

const interpolateTemplate = (template: string, model: Record<string, any>): string => {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key: string) => {
    const value = key.split(".").reduce<any>((acc, segment) => acc?.[segment], model);
    return value === undefined || value === null ? "" : String(value);
  });
};

const withLeadingDot = (value: string): string => (value.startsWith(".") ? value : `.${value}`);

export class ExpressAdapter implements HttpAdapter {
  public readonly type = "express" as const;
  private readonly app: any;
  private readonly viewsPath: string;
  private readonly fileExtension: string;
  private readonly templateRenderer?: (
    template: string,
    model: Record<string, any>,
    context: { req: HttpRequestLike; res: HttpResponseLike }
  ) => string | Promise<string>;
  private readonly hasNativeViewEngine: boolean;
  private closeServer?: { close: (cb?: (error?: Error) => void) => void };

  constructor(app: any, options?: ExpressAdapterOptions) {
    if (!app || typeof app.use !== "function" || typeof app.listen !== "function") {
      throw new Error("ExpressAdapter requires a valid express app instance");
    }

    const templateEngine = options?.templateEngine;
    const expressModule = require("express");

    if (typeof expressModule.json === "function") {
      app.use(expressModule.json());
    }

    if (typeof expressModule.urlencoded === "function") {
      app.use(expressModule.urlencoded({ extended: true }));
    }

    this.viewsPath = templateEngine?.viewsPath || path.join(process.cwd(), DEFAULT_VIEWS_FOLDER);
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
      const publicPath = staticFiles?.publicPath || path.join(process.cwd(), DEFAULT_PUBLIC_FOLDER);
      const urlPrefix = staticFiles?.urlPrefix || "/";
      const staticMiddleware = expressModule.static(publicPath);
      if (urlPrefix === "/") {
        app.use(staticMiddleware);
      } else {
        app.use(urlPrefix, staticMiddleware);
      }
    }

    this.templateRenderer = templateEngine?.render;
    this.hasNativeViewEngine = Boolean(templateEngine?.viewEngine || templateEngine?.engine);
    this.app = app;
  }

  private async renderFileTemplate(template: string, model: Record<string, any>): Promise<string> {
    const fullTemplateName = path.extname(template) ? template : `${template}${this.fileExtension}`;
    const templatePath = path.join(this.viewsPath, fullTemplateName);
    const templateFile = await readFile(templatePath, "utf-8");
    return interpolateTemplate(templateFile, model);
  }

  registerRequestHandler(handler: HttpRequestHandler): void {
    this.app.use(async (req: any, res: any) => {
      const method = (req.method || "GET").toUpperCase() as HttpMethod;
      if (!SUPPORTED_METHODS.includes(method)) {
        res.status(405).send("Method Not Allowed");
        return;
      }
      const parsedUrl = new URL(req.url || req.path || "/", "http://localhost");
      const path = req.path || parsedUrl.pathname || "/";
      const request = createNormalizedRequest(req, path, parsedUrl);
      await handler(method, path, request, res);
    });
  }

  async listen(options: Required<HttpServerOptions>): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.closeServer = this.app.listen(options.port, options.host, (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  async renderView(req: HttpRequestLike, res: HttpResponseLike, payload: HttpViewResult): Promise<void> {
    if (payload.statusCode && typeof res.status === "function") {
      res.status(payload.statusCode);
    } else if (payload.statusCode) {
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
      await new Promise<void>((resolve, reject) => {
        res.render!(payload.template, payload.model || {}, (error, html) => {
          if (error) {
            reject(error);
            return;
          }
          if (html !== undefined) {
            if (typeof res.send === "function") {
              res.send(html);
            } else {
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

  async close(): Promise<void> {
    if (!this.closeServer) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      this.closeServer!.close((error?: Error) => {
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
