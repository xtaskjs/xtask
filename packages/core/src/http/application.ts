import { HttpMethod } from "@xtaskjs/common";
import { clearCurrentContainer, Container, setCurrentContainer } from "../di";
import { Kernel } from "../kernel";
import { ApplicationLifeCycle } from "../server";
import { HttpError } from "./errors";
import { NodeHttpAdapter } from "./node-http-adapter";
import {
  HttpAdapter,
  HttpAdapterType,
  HttpRequestLike,
  HttpResponseLike,
  HttpServerOptions,
  HttpViewResult,
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

const isViewResult = (payload: any): payload is HttpViewResult => {
  return payload?.__xtaskView === true && typeof payload?.template === "string";
};

type ExpressAdapterConstructor = new (app: any) => HttpAdapter;
type FastifyAdapterConstructor = new (app: any) => HttpAdapter;

type TypeOrmInitializeFn = (container: Container) => Promise<void>;
type TypeOrmShutdownFn = () => Promise<void>;
type SecurityInitializeFn = (container: Container) => Promise<void>;
type SecurityShutdownFn = () => Promise<void>;
type MailerInitializeFn = (container: Container) => Promise<void>;
type MailerShutdownFn = () => Promise<void>;

const resolveExpressAdapter = (): ExpressAdapterConstructor => {
  try {
    const expressHttpPackage = require("@xtaskjs/express-http") as {
      ExpressAdapter?: ExpressAdapterConstructor;
    };

    if (typeof expressHttpPackage.ExpressAdapter !== "function") {
      throw new Error("@xtaskjs/express-http does not export ExpressAdapter");
    }

    return expressHttpPackage.ExpressAdapter;
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/express-http");

    if (missingPackage) {
      throw new Error(
        "express adapter requires @xtaskjs/express-http. Install it with: npm install @xtaskjs/express-http"
      );
    }

    throw error;
  }
};

const resolveFastifyAdapter = (): FastifyAdapterConstructor => {
  try {
    const fastifyHttpPackage = require("@xtaskjs/fastify-http") as {
      FastifyAdapter?: FastifyAdapterConstructor;
    };

    if (typeof fastifyHttpPackage.FastifyAdapter !== "function") {
      throw new Error("@xtaskjs/fastify-http does not export FastifyAdapter");
    }

    return fastifyHttpPackage.FastifyAdapter;
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/fastify-http");

    if (missingPackage) {
      throw new Error(
        "fastify adapter requires @xtaskjs/fastify-http. Install it with: npm install @xtaskjs/fastify-http"
      );
    }

    throw error;
  }
};

const resolveTypeOrmInitialize = (): TypeOrmInitializeFn | undefined => {
  try {
    const typeormPackage = require("@xtaskjs/typeorm") as {
      initializeTypeOrmIntegration?: TypeOrmInitializeFn;
    };

    if (typeof typeormPackage.initializeTypeOrmIntegration === "function") {
      return typeormPackage.initializeTypeOrmIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/typeorm");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveTypeOrmShutdown = (): TypeOrmShutdownFn | undefined => {
  try {
    const typeormPackage = require("@xtaskjs/typeorm") as {
      shutdownTypeOrmIntegration?: TypeOrmShutdownFn;
    };

    if (typeof typeormPackage.shutdownTypeOrmIntegration === "function") {
      return typeormPackage.shutdownTypeOrmIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/typeorm");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveSecurityInitialize = (): SecurityInitializeFn | undefined => {
  try {
    const securityPackage = require("@xtaskjs/security") as {
      initializeSecurityIntegration?: SecurityInitializeFn;
    };

    if (typeof securityPackage.initializeSecurityIntegration === "function") {
      return securityPackage.initializeSecurityIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/security");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveSecurityShutdown = (): SecurityShutdownFn | undefined => {
  try {
    const securityPackage = require("@xtaskjs/security") as {
      shutdownSecurityIntegration?: SecurityShutdownFn;
    };

    if (typeof securityPackage.shutdownSecurityIntegration === "function") {
      return securityPackage.shutdownSecurityIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/security");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveMailerInitialize = (): MailerInitializeFn | undefined => {
  try {
    const mailerPackage = require("@xtaskjs/mailer") as {
      initializeMailerIntegration?: MailerInitializeFn;
    };

    if (typeof mailerPackage.initializeMailerIntegration === "function") {
      return mailerPackage.initializeMailerIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/mailer");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveMailerShutdown = (): MailerShutdownFn | undefined => {
  try {
    const mailerPackage = require("@xtaskjs/mailer") as {
      shutdownMailerIntegration?: MailerShutdownFn;
    };

    if (typeof mailerPackage.shutdownMailerIntegration === "function") {
      return mailerPackage.shutdownMailerIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/mailer");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
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

      if (isViewResult(result)) {
        if (this.adapter.renderView) {
          await this.adapter.renderView(req, res, result);
          return;
        }

        throw new Error(
          `Adapter '${this.adapter.type}' does not support view rendering. Configure a template engine in the selected adapter.`
        );
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

      if (error instanceof HttpError || typeof error?.statusCode === "number") {
        const statusCode = error instanceof HttpError ? error.statusCode : error.statusCode;
        const payload =
          error?.payload !== undefined
            ? error.payload
            : { message: error?.message || "Request failed" };

        if (typeof res.status === "function" && typeof res.json === "function") {
          res.status(statusCode).json(payload);
          return;
        }

        res.statusCode = statusCode;
        res.setHeader?.("content-type", "application/json");
        res.end?.(JSON.stringify(payload));
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
    if (typeof (this.lifecycle as any).emit === "function") {
      await (this.lifecycle as any).emit("stopping");
    }

    await this.adapter.close();

    if (typeof (this.lifecycle as any).stop === "function") {
      await (this.lifecycle as any).stop();
    }

    const shutdownTypeOrmIntegration = resolveTypeOrmShutdown();
    if (shutdownTypeOrmIntegration) {
      await shutdownTypeOrmIntegration();
    }

    const shutdownSecurityIntegration = resolveSecurityShutdown();
    if (shutdownSecurityIntegration) {
      await shutdownSecurityIntegration();
    }

    const shutdownMailerIntegration = resolveMailerShutdown();
    if (shutdownMailerIntegration) {
      await shutdownMailerIntegration();
    }

    if (this.kernel && typeof (this.kernel as any).getContainer === "function") {
      const container = await (this.kernel as any).getContainer();
      if (container && typeof container.destroy === "function") {
        container.destroy();
      }
      clearCurrentContainer();
    }

    if (typeof (this.lifecycle as any).emit === "function") {
      await (this.lifecycle as any).emit("stopped");
    }
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
    const ExpressAdapter = resolveExpressAdapter();
    return new ExpressAdapter(adapterInstance);
  }

  if (adapter === "fastify") {
    const FastifyAdapter = resolveFastifyAdapter();
    return new FastifyAdapter(adapterInstance);
  }

  throw new Error(`Unsupported adapter type: ${adapter}`);
}

export async function registerContainerInLifecycle(
  kernel: Kernel,
  lifecycle: ApplicationLifeCycle
): Promise<void> {
  const container: Container = await kernel.getContainer();
  setCurrentContainer(container);

  const initializeTypeOrmIntegration = resolveTypeOrmInitialize();
  if (initializeTypeOrmIntegration) {
    await initializeTypeOrmIntegration(container);
  }

  const initializeSecurityIntegration = resolveSecurityInitialize();
  if (initializeSecurityIntegration) {
    await initializeSecurityIntegration(container);
  }

  const initializeMailerIntegration = resolveMailerInitialize();
  if (initializeMailerIntegration) {
    await initializeMailerIntegration(container);
  }

  container.registerLifeCycleListeners(lifecycle);
}
