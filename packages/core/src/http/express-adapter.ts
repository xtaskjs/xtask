import { HttpAdapter, HttpRequestHandler, HttpServerOptions } from "./types";
import { HttpMethod } from "@xtaskjs/common";

const SUPPORTED_METHODS: HttpMethod[] = ["GET", "POST", "PATCH", "DELETE"];

export class ExpressAdapter implements HttpAdapter {
  public readonly type = "express" as const;
  private readonly app: any;
  private closeServer?: { close: (cb?: (error?: Error) => void) => void };

  constructor(app: any) {
    if (!app || typeof app.use !== "function" || typeof app.listen !== "function") {
      throw new Error("ExpressAdapter requires a valid express app instance");
    }
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
