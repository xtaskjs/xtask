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

const SUPPORTED_METHODS: HttpMethod[] = ["GET", "POST", "PATCH", "DELETE"];

export class ExpressAdapter implements HttpAdapter {
  public readonly type = "express" as const;
  private readonly app: any;
  private readonly templateRenderer?: (
    template: string,
    model: Record<string, any>,
    context: { req: HttpRequestLike; res: HttpResponseLike }
  ) => string | Promise<string>;
  private closeServer?: { close: (cb?: (error?: Error) => void) => void };

  constructor(app: any, options?: ExpressAdapterOptions) {
    if (!app || typeof app.use !== "function" || typeof app.listen !== "function") {
      throw new Error("ExpressAdapter requires a valid express app instance");
    }

    const templateEngine = options?.templateEngine;
    if (templateEngine?.viewsPath && typeof app.set === "function") {
      app.set("views", templateEngine.viewsPath);
    }

    if (templateEngine?.engine && templateEngine.extension && typeof app.engine === "function") {
      app.engine(templateEngine.extension, templateEngine.engine);
    }

    if (templateEngine?.viewEngine && typeof app.set === "function") {
      app.set("view engine", templateEngine.viewEngine);
    }

    this.templateRenderer = templateEngine?.render;
    this.app = app;
  }

  registerRequestHandler(handler: HttpRequestHandler): void {
    this.app.use(async (req: any, res: any) => {
      const method = (req.method || "GET").toUpperCase() as HttpMethod;
      if (!SUPPORTED_METHODS.includes(method)) {
        res.status(405).send("Method Not Allowed");
        return;
      }
      const path = req.path || req.url || "/";
      await handler(method, path, req, res);
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

    if (typeof res.render === "function") {
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

    throw new Error(
      "Express template engine is not configured. Provide templateEngine.render or configure app.set('view engine', ...)"
    );
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
