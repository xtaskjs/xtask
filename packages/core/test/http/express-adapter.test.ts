import { ExpressAdapter } from "../../src/http/express-adapter";

describe("ExpressAdapter", () => {
  it("should throw when app instance is invalid", () => {
    expect(() => new ExpressAdapter({})).toThrow(
      "ExpressAdapter requires a valid express app instance"
    );
  });

  it("should register middleware and dispatch supported methods", async () => {
    let middleware: any;
    const app = {
      use: jest.fn((handler) => {
        middleware = handler;
      }),
      listen: jest.fn((_port, _host, callback) => callback()),
    };

    const adapter = new ExpressAdapter(app);
    const handler = jest.fn(async () => {});
    adapter.registerRequestHandler(handler);

    const req = { method: "GET", path: "/health" };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    await middleware(req, res);

    expect(handler).toHaveBeenCalledWith("GET", "/health", req, res);
  });

  it("should return 405 for unsupported methods", async () => {
    let middleware: any;
    const app = {
      use: jest.fn((handler) => {
        middleware = handler;
      }),
      listen: jest.fn((_port, _host, callback) => callback()),
    };

    const adapter = new ExpressAdapter(app);
    adapter.registerRequestHandler(jest.fn(async () => {}));

    const req = { method: "PUT", path: "/health" };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    await middleware(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.send).toHaveBeenCalledWith("Method Not Allowed");
  });

  it("should listen and close server", async () => {
    const close = jest.fn((cb) => cb());
    const app = {
      use: jest.fn(),
      listen: jest.fn((_port, _host, callback) => {
        callback();
        return { close };
      }),
    };

    const adapter = new ExpressAdapter(app);
    await adapter.listen({ host: "127.0.0.1", port: 3000 });
    await adapter.close();

    expect(app.listen).toHaveBeenCalledWith(3000, "127.0.0.1", expect.any(Function));
    expect(close).toHaveBeenCalledTimes(1);
  });
});
