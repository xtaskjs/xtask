import { createServer, IncomingMessage, Server, ServerResponse } from "http";
import { HttpAdapter, HttpRequestHandler, HttpServerOptions } from "./types";
import { HttpMethod } from "@xtaskjs/common";

const SUPPORTED_METHODS: HttpMethod[] = ["GET", "POST", "PATCH", "DELETE"];

export class NodeHttpAdapter implements HttpAdapter {
  public readonly type = "node-http" as const;
  private server?: Server;
  private handler?: HttpRequestHandler;

  registerRequestHandler(handler: HttpRequestHandler): void {
    this.handler = handler;
  }

  async listen(options: Required<HttpServerOptions>): Promise<void> {
    if (!this.handler) {
      throw new Error("No request handler registered for node-http adapter");
    }

    if (!this.server) {
      this.server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        try {
          const method = (req.method || "GET").toUpperCase() as HttpMethod;
          if (!SUPPORTED_METHODS.includes(method)) {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }

          const host = req.headers.host || "localhost";
          const url = new URL(req.url || "/", `http://${host}`);
          const path = url.pathname || "/";
          await this.handler!(method, path, req, res);
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ message: "Internal Server Error", error: error?.message }));
        }
      });
    }

    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(options.port, options.host, () => resolve());
    });
  }

  async close(): Promise<void> {
    if (!this.server) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    this.server = undefined;
  }
}
