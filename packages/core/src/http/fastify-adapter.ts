import { HttpAdapter, HttpRequestHandler, HttpServerOptions } from "./types";
import { HttpMethod } from "@xtaskjs/common";

const SUPPORTED_METHODS: HttpMethod[] = ["GET", "POST", "PATCH", "DELETE"];

export class FastifyAdapter implements HttpAdapter {
  public readonly type = "fastify" as const;
  private readonly app: any;

  constructor(app: any) {
    if (!app || typeof app.route !== "function" || typeof app.listen !== "function") {
      throw new Error("FastifyAdapter requires a valid fastify instance");
    }
    this.app = app;
  }

  registerRequestHandler(handler: HttpRequestHandler): void {
    this.app.route({
      method: ["GET", "POST", "PATCH", "DELETE"],
      url: "*",
      handler: async (request: any, reply: any) => {
        const method = (request.method || "GET").toUpperCase() as HttpMethod;
        if (!SUPPORTED_METHODS.includes(method)) {
          reply.code(405).send("Method Not Allowed");
          return;
        }
        const path = request.url || "/";
        await handler(method, path, request, reply);
      },
    });
  }

  async listen(options: Required<HttpServerOptions>): Promise<void> {
    await this.app.listen({ port: options.port, host: options.host });
  }

  async close(): Promise<void> {
    await this.app.close();
  }
}
