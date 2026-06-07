import {
  XTaskHttpApplication,
  clearHttpIntegrationResolverOverridesForTesting,
  createHttpAdapter,
  registerContainerInLifecycle,
  setHttpIntegrationResolverOverridesForTesting,
} from "../../src/http/application";
import { ForbiddenError } from "../../src/http/errors";
import { view } from "../../src/http/types";
import { initializeMailerIntegration, shutdownMailerIntegration } from "@xtaskjs/mailer";
import { initializeCacheIntegration, shutdownCacheIntegration } from "@xtaskjs/cache";
import { initializeCqrsIntegration, shutdownCqrsIntegration } from "@xtaskjs/cqrs";
import { initializeMcpIntegration, shutdownMcpIntegration } from "@xtaskjs/mcp";
import {
  initializeInternationalizationIntegration,
  runWithInternationalizationContext,
  shutdownInternationalizationIntegration,
} from "@xtaskjs/internationalization";

vi.mock("@xtaskjs/mailer", () => ({
  initializeMailerIntegration: vi.fn(async () => {}),
  shutdownMailerIntegration: vi.fn(async () => {}),
}));

vi.mock("@xtaskjs/cache", () => ({
  initializeCacheIntegration: vi.fn(async () => {}),
  shutdownCacheIntegration: vi.fn(async () => {}),
}));

vi.mock("@xtaskjs/cqrs", () => ({
  initializeCqrsIntegration: vi.fn(async () => {}),
  shutdownCqrsIntegration: vi.fn(async () => {}),
}));

vi.mock("@xtaskjs/mcp", () => ({
  initializeMcpIntegration: vi.fn(async () => {}),
  shutdownMcpIntegration: vi.fn(async () => {}),
}));

vi.mock("@xtaskjs/internationalization", () => ({
  initializeInternationalizationIntegration: vi.fn(async () => {}),
  shutdownInternationalizationIntegration: vi.fn(async () => {}),
  runWithInternationalizationContext: vi.fn(async (_request: any, callback: any) => callback()),
}));

vi.mock("@xtaskjs/typeorm", () => ({
  initializeTypeOrmIntegration: vi.fn(async () => {}),
  shutdownTypeOrmIntegration: vi.fn(async () => {}),
}));

vi.mock("@xtaskjs/security", () => ({
  initializeSecurityIntegration: vi.fn(async () => {}),
  shutdownSecurityIntegration: vi.fn(async () => {}),
}));

vi.mock("@xtaskjs/scheduler", () => ({
  initializeSchedulerIntegration: vi.fn(async () => {}),
  shutdownSchedulerIntegration: vi.fn(async () => {}),
}));

vi.mock("@xtaskjs/queues", () => ({
  initializeQueueIntegration: vi.fn(async () => {}),
  shutdownQueueIntegration: vi.fn(async () => {}),
}));

vi.mock("@xtaskjs/event-source", () => ({
  initializeEventSourceIntegration: vi.fn(async () => {}),
  shutdownEventSourceIntegration: vi.fn(async () => {}),
}));

vi.mock("@xtaskjs/throttler", () => ({
  initializeThrottlerIntegration: vi.fn(async () => {}),
  shutdownThrottlerIntegration: vi.fn(async () => {}),
}));

vi.mock("@xtaskjs/config", () => ({
  initializeConfigIntegration: vi.fn(async () => {}),
  shutdownConfigIntegration: vi.fn(async () => {}),
}));

vi.mock("@xtaskjs/validation", () => ({
  initializeValidationIntegration: vi.fn(async () => {}),
  shutdownValidationIntegration: vi.fn(async () => {}),
}));

const socketIoMocks = vi.hoisted(() => ({
  initializeSocketIoIntegration: vi.fn(async () => {}),
  shutdownSocketIoIntegration: vi.fn(async () => {}),
}));

vi.mock(
  "@xtaskjs/socket-io",
  () => socketIoMocks,
  { virtual: true }
);

const { initializeSocketIoIntegration, shutdownSocketIoIntegration } = socketIoMocks;

class FakeNodeAdapter {
  type = "node-http" as const;
  registerRequestHandler = vi.fn();
  listen = vi.fn(async () => {});
  close = vi.fn(async () => {});
  getHttpServer = vi.fn(() => ({ close: vi.fn() }));
}

class FakeExpressAdapter {
  type = "express" as const;
  constructor(private readonly _app: any) {}
  registerRequestHandler = vi.fn();
  listen = vi.fn(async () => {});
  close = vi.fn(async () => {});
}

class FakeFastifyAdapter {
  type = "fastify" as const;
  constructor(private readonly _app: any) {}
  registerRequestHandler = vi.fn();
  listen = vi.fn(async () => {});
  close = vi.fn(async () => {});
}

describe("XTaskHttpApplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setHttpIntegrationResolverOverridesForTesting({
      expressAdapter: FakeExpressAdapter as any,
      fastifyAdapter: FakeFastifyAdapter as any,
      socketIoInitialize: initializeSocketIoIntegration,
      socketIoShutdown: shutdownSocketIoIntegration,
      cqrsInitialize: initializeCqrsIntegration,
      cqrsShutdown: shutdownCqrsIntegration,
      mailerInitialize: initializeMailerIntegration,
      mailerShutdown: shutdownMailerIntegration,
      cacheInitialize: initializeCacheIntegration,
      cacheShutdown: shutdownCacheIntegration,
      mcpInitialize: initializeMcpIntegration,
      mcpShutdown: shutdownMcpIntegration,
      internationalizationInitialize: initializeInternationalizationIntegration,
      internationalizationShutdown: shutdownInternationalizationIntegration,
      internationalizationContextRunner: runWithInternationalizationContext,
    });
  });

  afterEach(() => {
    clearHttpIntegrationResolverOverridesForTesting();
  });

  it("should register request handler on construction", () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: vi.fn() } as any;
    const kernel = {} as any;

    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel });

    expect(adapter.registerRequestHandler).toHaveBeenCalledTimes(1);
  });

  it("should execute requests inside the internationalization context when available", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: vi.fn(async () => ({ ok: true })) } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const req = { headers: { "accept-language": "es-ES" } };
    const res = { json: vi.fn(), setHeader: vi.fn(), end: vi.fn() } as any;

    await requestHandler("GET", "/health", req, res);

    expect(runWithInternationalizationContext).toHaveBeenCalledWith(req, expect.any(Function));
    expect(lifecycle.dispatchControllerRoute).toHaveBeenCalledWith("GET", "/health", req, res);
  });

  it("should return 204 when handler returns undefined", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: vi.fn(async () => undefined) } as any;
    const kernel = {} as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { end: vi.fn(), setHeader: vi.fn() } as any;

    await requestHandler("GET", "/health", {}, res);

    expect(res.statusCode).toBe(204);
    expect(res.end).toHaveBeenCalled();
  });

  it("should use json response when available", async () => {
    const adapter = new FakeNodeAdapter();
    const payload = { ok: true };
    const lifecycle = { dispatchControllerRoute: vi.fn(async () => payload) } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { json: vi.fn(), setHeader: vi.fn(), end: vi.fn() } as any;

    await requestHandler("GET", "/health", {}, res);

    expect(res.json).toHaveBeenCalledWith(payload);
    expect(res.end).not.toHaveBeenCalled();
  });

  it("should serialize object payload when json is unavailable", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: vi.fn(async () => ({ ok: true })) } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { setHeader: vi.fn(), end: vi.fn() } as any;

    await requestHandler("GET", "/health", {}, res);

    expect(res.statusCode).toBe(200);
    expect(res.setHeader).toHaveBeenCalledWith("content-type", "application/json");
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ ok: true }));
  });

  it("should use send for primitive payload when available", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: vi.fn(async () => "OK") } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { send: vi.fn(), end: vi.fn() } as any;

    await requestHandler("GET", "/health", {}, res);

    expect(res.statusCode).toBe(200);
    expect(res.send).toHaveBeenCalledWith("OK");
    expect(res.end).not.toHaveBeenCalled();
  });

  it("should return early when headers were already sent", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: vi.fn(async () => "OK") } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { headersSent: true, send: vi.fn(), end: vi.fn() } as any;

    await requestHandler("GET", "/health", {}, res);

    expect(res.send).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  it("should map missing route error to 404", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = {
      dispatchControllerRoute: vi.fn(async () => {
        throw new Error("No route registered for GET /missing");
      }),
    } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      end: vi.fn(),
    } as any;

    await requestHandler("GET", "/missing", {}, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith("Not Found");
  });

  it("should map generic error to 500 json", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = {
      dispatchControllerRoute: vi.fn(async () => {
        throw new Error("boom");
      }),
    } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

    await requestHandler("GET", "/health", {}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error", error: "boom" });
  });

  it("should map HttpError instances to their status code", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = {
      dispatchControllerRoute: vi.fn(async () => {
        throw new ForbiddenError("nope", { message: "Forbidden", code: "AUTH_FORBIDDEN" });
      }),
    } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

    await requestHandler("GET", "/secure", {}, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden", code: "AUTH_FORBIDDEN" });
  });

  it("should preserve payload for non-HttpError statusCode exceptions", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = {
      dispatchControllerRoute: vi.fn(async () => {
        const error = new Error("Validation failed") as Error & {
          statusCode: number;
          payload: any;
        };
        error.statusCode = 400;
        error.payload = {
          message: "Validation failed",
          fields: ["to", "name"],
          errors: [
            { property: "to", constraints: ["to must be an email"] },
            { property: "name", constraints: ["name should not be empty"] },
          ],
        };
        throw error;
      }),
    } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

    await requestHandler("POST", "/email/welcome", {}, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Validation failed",
      fields: ["to", "name"],
      errors: [
        { property: "to", constraints: ["to must be an email"] },
        { property: "name", constraints: ["name should not be empty"] },
      ],
    });
  });

  it("should log startup with adapter and url", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: vi.fn() } as any;
    const container = { registerLifeCycleListeners: vi.fn() };
    const kernel = { getContainer: vi.fn(async () => container) };
    const app = new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: kernel as any });

    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const spy = vi.spyOn(console, "log").mockImplementation();

    await app.listen({ host: "0.0.0.0", port: 4000 });

    expect(adapter.listen).toHaveBeenCalledWith({ host: "0.0.0.0", port: 4000 });
    expect(initializeSocketIoIntegration).toHaveBeenCalledWith(
      container,
      lifecycle,
      adapter
    );
    expect(spy).toHaveBeenCalledWith(
      "[HTTP] Server started | adapter=node-http | url=http://localhost:4000"
    );

    spy.mockRestore();
    process.env.NODE_ENV = previous;
  });

  it("should expose kernel and lifecycle", () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: vi.fn() } as any;
    const kernel = {} as any;
    const app = new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel });

    expect(app.getKernel()).toBe(kernel);
    expect(app.getLifecycle()).toBe(lifecycle);
  });

  it("should close via adapter", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: vi.fn() } as any;
    const app = new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      await app.close();
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }

    expect(shutdownSocketIoIntegration).toHaveBeenCalledTimes(1);
    expect(adapter.close).toHaveBeenCalledTimes(1);
    expect(shutdownCqrsIntegration).toHaveBeenCalledTimes(1);
    expect(shutdownMailerIntegration).toHaveBeenCalledTimes(1);
    expect(shutdownCacheIntegration).toHaveBeenCalledTimes(1);
    expect(shutdownMcpIntegration).toHaveBeenCalledTimes(1);
    expect(shutdownInternationalizationIntegration).toHaveBeenCalledTimes(1);
  }, 30000);

  it("should render a view using adapter renderView", async () => {
    const adapter = {
      type: "node-http" as const,
      registerRequestHandler: vi.fn(),
      renderView: vi.fn(async () => {}),
      listen: vi.fn(async () => {}),
      close: vi.fn(async () => {}),
    };
    const lifecycle = {
      dispatchControllerRoute: vi.fn(async () => view("home", { title: "Welcome" }, 201)),
    } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const req = {};
    const res = { end: vi.fn() };

    await requestHandler("GET", "/", req, res);

    expect(adapter.renderView).toHaveBeenCalledWith(req, res, view("home", { title: "Welcome" }, 201));
  });

  it("should return 500 when adapter does not support view rendering", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = {
      dispatchControllerRoute: vi.fn(async () => view("home", { title: "Welcome" })),
    } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

    await requestHandler("GET", "/", {}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Internal Server Error",
      error:
        "Adapter 'node-http' does not support view rendering. Configure a template engine in the selected adapter.",
    });
  });
});

describe("http application factories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setHttpIntegrationResolverOverridesForTesting({
      expressAdapter: FakeExpressAdapter as any,
      fastifyAdapter: FakeFastifyAdapter as any,
      socketIoInitialize: initializeSocketIoIntegration,
      socketIoShutdown: shutdownSocketIoIntegration,
      cqrsInitialize: initializeCqrsIntegration,
      cqrsShutdown: shutdownCqrsIntegration,
      mailerInitialize: initializeMailerIntegration,
      mailerShutdown: shutdownMailerIntegration,
      cacheInitialize: initializeCacheIntegration,
      cacheShutdown: shutdownCacheIntegration,
      mcpInitialize: initializeMcpIntegration,
      mcpShutdown: shutdownMcpIntegration,
      internationalizationInitialize: initializeInternationalizationIntegration,
      internationalizationShutdown: shutdownInternationalizationIntegration,
      internationalizationContextRunner: runWithInternationalizationContext,
    });
  });

  afterEach(() => {
    clearHttpIntegrationResolverOverridesForTesting();
  });

  it("should create node adapter by default", () => {
    const adapter = createHttpAdapter();
    expect(adapter.type).toBe("node-http");
  });

  it("should return adapter when a custom object is provided", () => {
    const custom = {
      type: "node-http",
      registerRequestHandler: vi.fn(),
      listen: vi.fn(),
      close: vi.fn(),
    } as any;

    expect(createHttpAdapter(custom)).toBe(custom);
  });

  it("should create express adapter from instance", () => {
    const expressLike = {
      use: vi.fn(),
      listen: vi.fn(),
    };
    const adapter = createHttpAdapter("express", expressLike);
    expect(adapter.type).toBe("express");
  });

  it("should create fastify adapter from instance", () => {
    const fastifyLike = {
      route: vi.fn(),
      listen: vi.fn(),
      close: vi.fn(),
    };
    const adapter = createHttpAdapter("fastify", fastifyLike);
    expect(adapter.type).toBe("fastify");
  });

  it("should throw when adapter instance is missing", () => {
    expect(() => createHttpAdapter("express")).toThrow(
      "express adapter requires 'adapterInstance' in CreateApplicationOptions"
    );
  });

  it("should throw for unsupported adapter type", () => {
    expect(() => createHttpAdapter("unknown" as any, {})).toThrow(
      "Unsupported adapter type: unknown"
    );
  });

  it("should register container in lifecycle", async () => {
    const registerLifeCycleListeners = vi.fn();
    const container = { registerLifeCycleListeners };
    const kernel = { getContainer: vi.fn(async () => container) } as any;
    const lifecycle = {} as any;

    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    try {
      await registerContainerInLifecycle(kernel, lifecycle);
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }

    expect(kernel.getContainer).toHaveBeenCalledTimes(1);
    expect(initializeSocketIoIntegration).toHaveBeenCalledWith(container, lifecycle);
    expect(initializeCqrsIntegration).toHaveBeenCalledWith(container, lifecycle);
    expect(initializeMailerIntegration).toHaveBeenCalledWith(container);
    expect(initializeCacheIntegration).toHaveBeenCalledWith(container, lifecycle);
    expect(initializeMcpIntegration).toHaveBeenCalledWith(container, lifecycle);
    expect(initializeInternationalizationIntegration).toHaveBeenCalledWith(container);
    expect(registerLifeCycleListeners).toHaveBeenCalledTimes(1);
  }, 30000);
});
