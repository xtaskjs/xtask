import { HttpMethod } from "@xtaskjs/common";
import {
  FastifyAdapterOptions,
  HttpAdapter,
  HttpRequestHandler,
  HttpRequestLike,
  HttpResponseLike,
  HttpServerOptions,
  HttpViewResult,
} from "./types";
import { access, readFile } from "fs/promises";
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

const createNormalizedRequest = (request: any, path: string, parsedUrl: URL): HttpRequestLike => {
  const normalizedRequest = Object.create(request);
  Object.defineProperties(normalizedRequest, {
    path: {
      value: path,
      enumerable: true,
      configurable: true,
      writable: true,
    },
    query: {
      value: request.query || toQueryObject(parsedUrl),
      enumerable: true,
      configurable: true,
      writable: true,
    },
    params: {
      value: request.params || {},
      enumerable: true,
      configurable: true,
      writable: true,
    },
    body: {
      value: request.body,
      enumerable: true,
      configurable: true,
      writable: true,
    },
    url: {
      value: request.url,
      enumerable: true,
      configurable: true,
      writable: true,
    },
    method: {
      value: request.method,
      enumerable: true,
      configurable: true,
      writable: true,
    },
    headers: {
      value: request.headers,
      enumerable: true,
      configurable: true,
      writable: true,
    },
  });
  return normalizedRequest;
};

const withLeadingSlash = (value: string): string => {
  if (!value) {
    return "/";
  }
  return value.startsWith("/") ? value : `/${value}`;
};

const withLeadingDot = (value: string): string => (value.startsWith(".") ? value : `.${value}`);

const interpolateTemplate = (template: string, model: Record<string, any>): string => {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key: string) => {
    const value = key.split(".").reduce<any>((acc, segment) => acc?.[segment], model);
    return value === undefined || value === null ? "" : String(value);
  });
};

const getContentType = (filePath: string): string => {
  const extension = path.extname(filePath).toLowerCase();
  const contentTypes: Record<string, string> = {
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

export class FastifyAdapter implements HttpAdapter {
  public readonly type = "fastify" as const;
  private readonly app: any;
  private readonly templateRenderer?: (
    template: string,
    model: Record<string, any>,
    context: { req: HttpRequestLike; res: HttpResponseLike }
  ) => string | Promise<string>;
  private readonly nativeTemplateRenderer?: (
    res: HttpResponseLike,
    template: string,
    model: Record<string, any>
  ) => Promise<any>;
  private readonly staticEnabled: boolean;
  private readonly publicPath: string;
  private readonly publicPrefix: string;
  private readonly resolvedPublicPath: string;
  private readonly viewsPath: string;
  private readonly fileExtension: string;
  private readonly resolvedViewsPath: string;

  constructor(app: any, options?: FastifyAdapterOptions) {
    if (!app || typeof app.route !== "function" || typeof app.listen !== "function") {
      throw new Error("FastifyAdapter requires a valid fastify instance");
    }

    const templateEngine = options?.templateEngine;
    const staticFiles = options?.staticFiles;

    this.templateRenderer = templateEngine?.render;
    this.nativeTemplateRenderer = templateEngine?.nativeRender;

    this.viewsPath = templateEngine?.viewsPath || path.join(process.cwd(), DEFAULT_VIEWS_FOLDER);
    this.fileExtension = withLeadingDot(templateEngine?.fileExtension || DEFAULT_FILE_EXTENSION);
    this.resolvedViewsPath = path.resolve(this.viewsPath);

    this.staticEnabled = staticFiles?.enabled !== false;
    this.publicPath = staticFiles?.publicPath || path.join(process.cwd(), DEFAULT_PUBLIC_FOLDER);
    this.publicPrefix = withLeadingSlash(staticFiles?.urlPrefix || "/");
    this.resolvedPublicPath = path.resolve(this.publicPath);

    this.app = app;
  }

  private async renderFileTemplate(template: string, model: Record<string, any>): Promise<string> {
    const fullTemplateName = path.extname(template) ? template : `${template}${this.fileExtension}`;
    const templatePath = path.resolve(path.join(this.viewsPath, fullTemplateName));
    if (!templatePath.startsWith(this.resolvedViewsPath)) {
      throw new Error("Template path is outside configured views directory");
    }
    const templateFile = await readFile(templatePath, "utf-8");
    return interpolateTemplate(templateFile, model);
  }

  private async tryServeStatic(request: any, reply: any): Promise<boolean> {
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
    const staticFilePath = path.resolve(path.join(this.publicPath, decodedRelativePath));
    if (!staticFilePath.startsWith(this.resolvedPublicPath)) {
      return false;
    }

    try {
      await access(staticFilePath);
      const content = await readFile(staticFilePath);
      if (typeof reply.header === "function") {
        reply.header("content-type", getContentType(staticFilePath));
      }
      reply.send(content);
      return true;
    } catch {
      return false;
    }
  }

  private createResponseProxy(reply: any): HttpResponseLike {
    const proxy: HttpResponseLike = {
      get statusCode() {
        return reply.statusCode;
      },
      set statusCode(code: number | undefined) {
        if (typeof code === "number") {
          reply.code(code);
        }
      },
      get headersSent() {
        return Boolean(reply.sent);
      },
      setHeader(name: string, value: string) {
        reply.header(name, value);
      },
      end(chunk?: any) {
        reply.send(chunk);
      },
      json(payload: any) {
        reply.send(payload);
      },
      send(payload: any) {
        reply.send(payload);
      },
      status(code: number) {
        reply.code(code);
        return proxy;
      },
      code(code: number) {
        reply.code(code);
        return proxy;
      },
      header(name: string, value: string) {
        reply.header(name, value);
        return proxy;
      },
    };

    if (typeof reply.view === "function") {
      proxy.view = (template: string, locals?: Record<string, any>) => {
        return reply.view(template, locals);
      };
    }

    return proxy;
  }

  registerRequestHandler(handler: HttpRequestHandler): void {
    this.app.route({
      method: ["GET", "POST", "PATCH", "DELETE"],
      url: "*",
      handler: async (request: any, reply: any) => {
        if (await this.tryServeStatic(request, reply)) {
          return;
        }

        const method = (request.method || "GET").toUpperCase() as HttpMethod;
        if (!SUPPORTED_METHODS.includes(method)) {
          reply.code(405).send("Method Not Allowed");
          return;
        }
        const parsedUrl = new URL(request.url || request.path || "/", "http://localhost");
        const path = request.path || parsedUrl.pathname || "/";
        const normalizedRequest = createNormalizedRequest(request, path, parsedUrl);
        const response = this.createResponseProxy(reply);
        await handler(method, path, normalizedRequest, response);
      },
    });
  }

  async listen(options: Required<HttpServerOptions>): Promise<void> {
    await this.app.listen({ port: options.port, host: options.host });
  }

  async renderView(req: HttpRequestLike, res: HttpResponseLike, payload: HttpViewResult): Promise<void> {
    if (payload.statusCode && typeof res.code === "function") {
      res.code(payload.statusCode);
    } else if (payload.statusCode && typeof res.status === "function") {
      res.status(payload.statusCode);
    } else if (payload.statusCode) {
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

  async close(): Promise<void> {
    await this.app.close();
  }
}
