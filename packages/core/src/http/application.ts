import { HttpMethod } from "@xtaskjs/common";
import { Container } from "../di";
import { Kernel } from "../kernel";
import { ApplicationLifeCycle } from "../server";
import { ExpressAdapter } from "./express-adapter";
import { FastifyAdapter } from "./fastify-adapter";
import { NodeHttpAdapter } from "./node-http-adapter";
import {
  HttpAdapter,
  HttpAdapterType,
  HttpRequestLike,
  HttpResponseLike,
  HttpServerOptions,
} from "./types";

export interface CreateApplicationOptions {
  adapter?: HttpAdapter | HttpAdapterType;
  adapterInstance?: any;
  server?: HttpServerOptions;
  autoListen?: boolean;
}

const defaultServerOptions: Required<HttpServerOptions> = {
  host: "127.0.0.1",
  port: 3000,
};

const normalizeServerOptions = (
  options: HttpServerOptions | undefined
): Required<HttpServerOptions> => ({
  host: options?.host || defaultServerOptions.host,
  port: options?.port || defaultServerOptions.port,
});

const toDisplayHost = (host: string): string => {
  if (host === "0.0.0.0" || host === "::") {
    return "localhost";
  }
  return host;
};

const normalizePath = (value: string): string => {
  if (!value || value === "/") {
    return "/";
  }
  return value.endsWith("/") && value.length > 1 ? value.slice(0, -1) : value;
};

const isRouteNotFoundError = (error: any) => {
  return typeof error?.message === "string" && error.message.startsWith("No route registered for");
};

export class XTaskHttpApplication {
  private readonly adapter: HttpAdapter;
  private readonly lifecycle: ApplicationLifeCycle;
  private readonly kernel: Kernel;

  constructor(params: {
    adapter: HttpAdapter;
    lifecycle: ApplicationLifeCycle;
    kernel: Kernel;
  }) {
    this.adapter = params.adapter;
    this.lifecycle = params.lifecycle;
    this.kernel = params.kernel;
    this.adapter.registerRequestHandler(this.dispatchRequest.bind(this));
  }

  private async dispatchRequest(
    method: HttpMethod,
    path: string,
    req: HttpRequestLike,
    res: HttpResponseLike
  ): Promise<void> {
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
    } catch (error) {
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

  async listen(options?: HttpServerOptions): Promise<void> {
    const serverOptions = normalizeServerOptions(options);
    await this.adapter.listen(serverOptions);

    if (process.env.NODE_ENV !== "test") {
      const displayHost = toDisplayHost(serverOptions.host);
      const url = `http://${displayHost}:${serverOptions.port}`;
      console.log(`[HTTP] Server started | adapter=${this.adapter.type} | url=${url}`);
    }
  }

  async close(): Promise<void> {
    await this.adapter.close();
  }

  getKernel(): Kernel {
    return this.kernel;
  }

  getLifecycle(): ApplicationLifeCycle {
    return this.lifecycle;
  }
}

export function createHttpAdapter(
  adapter: HttpAdapter | HttpAdapterType = "node-http",
  adapterInstance?: any
): HttpAdapter {
  if (typeof adapter !== "string") {
    return adapter;
  }

  if (adapter === "node-http") {
    return new NodeHttpAdapter();
  }

  if (!adapterInstance) {
    throw new Error(`${adapter} adapter requires 'adapterInstance' in CreateApplicationOptions`);
  }

  if (adapter === "express") {
    return new ExpressAdapter(adapterInstance);
  }

  if (adapter === "fastify") {
    return new FastifyAdapter(adapterInstance);
  }

  throw new Error(`Unsupported adapter type: ${adapter}`);
}

export async function registerContainerInLifecycle(
  kernel: Kernel,
  lifecycle: ApplicationLifeCycle
): Promise<void> {
  const container: Container = await kernel.getContainer();
  container.registerLifeCycleListeners(lifecycle);
}
