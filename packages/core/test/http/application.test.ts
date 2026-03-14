import {
  XTaskHttpApplication,
  createHttpAdapter,
  registerContainerInLifecycle,
} from "../../src/http/application";
import { ForbiddenError } from "../../src/http/errors";
import { view } from "../../src/http/types";

class FakeNodeAdapter {
  type = "node-http" as const;
  registerRequestHandler = jest.fn();
  listen = jest.fn(async () => {});
  close = jest.fn(async () => {});
}

describe("XTaskHttpApplication", () => {
  it("should register request handler on construction", () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: jest.fn() } as any;
    const kernel = {} as any;

    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel });

    expect(adapter.registerRequestHandler).toHaveBeenCalledTimes(1);
  });

  it("should return 204 when handler returns undefined", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: jest.fn(async () => undefined) } as any;
    const kernel = {} as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { end: jest.fn(), setHeader: jest.fn() } as any;

    await requestHandler("GET", "/health", {}, res);

    expect(res.statusCode).toBe(204);
    expect(res.end).toHaveBeenCalled();
  });

  it("should use json response when available", async () => {
    const adapter = new FakeNodeAdapter();
    const payload = { ok: true };
    const lifecycle = { dispatchControllerRoute: jest.fn(async () => payload) } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { json: jest.fn(), setHeader: jest.fn(), end: jest.fn() } as any;

    await requestHandler("GET", "/health", {}, res);

    expect(res.json).toHaveBeenCalledWith(payload);
    expect(res.end).not.toHaveBeenCalled();
  });

  it("should serialize object payload when json is unavailable", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: jest.fn(async () => ({ ok: true })) } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { setHeader: jest.fn(), end: jest.fn() } as any;

    await requestHandler("GET", "/health", {}, res);

    expect(res.statusCode).toBe(200);
    expect(res.setHeader).toHaveBeenCalledWith("content-type", "application/json");
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ ok: true }));
  });

  it("should use send for primitive payload when available", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: jest.fn(async () => "OK") } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { send: jest.fn(), end: jest.fn() } as any;

    await requestHandler("GET", "/health", {}, res);

    expect(res.statusCode).toBe(200);
    expect(res.send).toHaveBeenCalledWith("OK");
    expect(res.end).not.toHaveBeenCalled();
  });

  it("should return early when headers were already sent", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: jest.fn(async () => "OK") } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { headersSent: true, send: jest.fn(), end: jest.fn() } as any;

    await requestHandler("GET", "/health", {}, res);

    expect(res.send).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  it("should map missing route error to 404", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = {
      dispatchControllerRoute: jest.fn(async () => {
        throw new Error("No route registered for GET /missing");
      }),
    } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      end: jest.fn(),
    } as any;

    await requestHandler("GET", "/missing", {}, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith("Not Found");
  });

  it("should map generic error to 500 json", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = {
      dispatchControllerRoute: jest.fn(async () => {
        throw new Error("boom");
      }),
    } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

    await requestHandler("GET", "/health", {}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error", error: "boom" });
  });

  it("should map HttpError instances to their status code", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = {
      dispatchControllerRoute: jest.fn(async () => {
        throw new ForbiddenError("nope", { message: "Forbidden", code: "AUTH_FORBIDDEN" });
      }),
    } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

    await requestHandler("GET", "/secure", {}, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden", code: "AUTH_FORBIDDEN" });
  });

  it("should log startup with adapter and url", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: jest.fn() } as any;
    const app = new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const spy = jest.spyOn(console, "log").mockImplementation();

    await app.listen({ host: "0.0.0.0", port: 4000 });

    expect(adapter.listen).toHaveBeenCalledWith({ host: "0.0.0.0", port: 4000 });
    expect(spy).toHaveBeenCalledWith(
      "[HTTP] Server started | adapter=node-http | url=http://localhost:4000"
    );

    spy.mockRestore();
    process.env.NODE_ENV = previous;
  });

  it("should expose kernel and lifecycle", () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: jest.fn() } as any;
    const kernel = {} as any;
    const app = new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel });

    expect(app.getKernel()).toBe(kernel);
    expect(app.getLifecycle()).toBe(lifecycle);
  });

  it("should close via adapter", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = { dispatchControllerRoute: jest.fn() } as any;
    const app = new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    await app.close();

    expect(adapter.close).toHaveBeenCalledTimes(1);
  });

  it("should render a view using adapter renderView", async () => {
    const adapter = {
      type: "node-http" as const,
      registerRequestHandler: jest.fn(),
      renderView: jest.fn(async () => {}),
      listen: jest.fn(async () => {}),
      close: jest.fn(async () => {}),
    };
    const lifecycle = {
      dispatchControllerRoute: jest.fn(async () => view("home", { title: "Welcome" }, 201)),
    } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const req = {};
    const res = { end: jest.fn() };

    await requestHandler("GET", "/", req, res);

    expect(adapter.renderView).toHaveBeenCalledWith(req, res, view("home", { title: "Welcome" }, 201));
  });

  it("should return 500 when adapter does not support view rendering", async () => {
    const adapter = new FakeNodeAdapter();
    const lifecycle = {
      dispatchControllerRoute: jest.fn(async () => view("home", { title: "Welcome" })),
    } as any;
    new XTaskHttpApplication({ adapter: adapter as any, lifecycle, kernel: {} as any });

    const requestHandler = adapter.registerRequestHandler.mock.calls[0][0];
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

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
  it("should create node adapter by default", () => {
    const adapter = createHttpAdapter();
    expect(adapter.type).toBe("node-http");
  });

  it("should return adapter when a custom object is provided", () => {
    const custom = {
      type: "node-http",
      registerRequestHandler: jest.fn(),
      listen: jest.fn(),
      close: jest.fn(),
    } as any;

    expect(createHttpAdapter(custom)).toBe(custom);
  });

  it("should create express adapter from instance", () => {
    const expressLike = {
      use: jest.fn(),
      listen: jest.fn(),
    };
    const adapter = createHttpAdapter("express", expressLike);
    expect(adapter.type).toBe("express");
  });

  it("should create fastify adapter from instance", () => {
    const fastifyLike = {
      route: jest.fn(),
      listen: jest.fn(),
      close: jest.fn(),
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
    const registerLifeCycleListeners = jest.fn();
    const container = { registerLifeCycleListeners };
    const kernel = { getContainer: jest.fn(async () => container) } as any;

    await registerContainerInLifecycle(kernel, {} as any);

    expect(kernel.getContainer).toHaveBeenCalledTimes(1);
    expect(registerLifeCycleListeners).toHaveBeenCalledTimes(1);
  });
});
