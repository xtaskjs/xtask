import { createServer, IncomingMessage, Server, ServerResponse } from "http";
import { HttpAdapter, HttpRequestHandler, HttpServerOptions } from "./types";
import { HttpMethod } from "@xtaskjs/common";

const SUPPORTED_METHODS: HttpMethod[] = ["GET", "POST", "PATCH", "DELETE"];

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

const createBadRequestError = (message: string): Error & { statusCode: number } => {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = 400;
  return error;
};

const parseRequestBody = async (req: IncomingMessage): Promise<any> => {
  const existingBody = (req as any).body;
  if (existingBody !== undefined) {
    return existingBody;
  }

  if (typeof (req as any)[Symbol.asyncIterator] !== "function") {
    return undefined;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) {
    return undefined;
  }

  const rawBody = Buffer.concat(chunks).toString("utf-8");
  (req as any).rawBody = rawBody;

  const contentType = String(req.headers["content-type"] || "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  if (contentType === "application/json") {
    try {
      return JSON.parse(rawBody);
    } catch {
      throw createBadRequestError("Invalid JSON body");
    }
  }

  if (contentType === "application/x-www-form-urlencoded") {
    const query: Record<string, any> = {};
    for (const [key, value] of new URLSearchParams(rawBody).entries()) {
      appendQueryValue(query, key, value);
    }
    return query;
  }

  return rawBody;
};

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
          const request = req as IncomingMessage & Record<string, any>;
          request.path = path;
          request.query = toQueryObject(url);
          request.body = await parseRequestBody(req);
          request.params = request.params || {};

          await this.handler!(method, path, request, res);
        } catch (error) {
          res.statusCode = 500;
          if (typeof error?.statusCode === "number") {
            res.statusCode = error.statusCode;
          }
          res.setHeader("content-type", "application/json");
          res.end(
            JSON.stringify({
              message: error?.statusCode === 400 ? error.message : "Internal Server Error",
              error: error?.message,
            })
          );
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
