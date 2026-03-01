import { ExpressAdapter } from "../src/express-adapter";

describe("ExpressAdapter", () => {
  it("should throw if app is invalid", () => {
    expect(() => new ExpressAdapter({})).toThrow(
      "ExpressAdapter requires a valid express app instance"
    );
  });

  it("should register a request handler and reject unsupported methods", async () => {
    const middlewareRegistry: any[] = [];
    const app = {
      use: (fn: any) => middlewareRegistry.push(fn),
      listen: jest.fn((_port: number, _host: string, cb: (error?: Error) => void) => {
        cb();
        return { close: jest.fn() };
      }),
    };

    const adapter = new ExpressAdapter(app);
    const handler = jest.fn(async () => {});
    adapter.registerRequestHandler(handler);

    const middleware = middlewareRegistry[0];
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    await middleware({ method: "PUT", path: "/x" }, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.send).toHaveBeenCalledWith("Method Not Allowed");
    expect(handler).not.toHaveBeenCalled();
  });

  it("should forward supported requests to handler", async () => {
    const middlewareRegistry: any[] = [];
    const app = {
      use: (fn: any) => middlewareRegistry.push(fn),
      listen: jest.fn((_port: number, _host: string, cb: (error?: Error) => void) => {
        cb();
        return { close: jest.fn() };
      }),
    };

    const adapter = new ExpressAdapter(app);
    const handler = jest.fn(async () => {});
    adapter.registerRequestHandler(handler);

    const req = { method: "GET", path: "/hello" };
    const res = {};
    await middlewareRegistry[0](req, res);

    expect(handler).toHaveBeenCalledWith("GET", "/hello", req, res);
  });

  it("should listen and close gracefully", async () => {
    const close = jest.fn((cb?: (error?: Error) => void) => cb?.());
    const app = {
      use: jest.fn(),
      listen: jest.fn((_port: number, _host: string, cb: (error?: Error) => void) => {
        cb();
        return { close };
      }),
    };

    const adapter = new ExpressAdapter(app);
    await adapter.listen({ host: "127.0.0.1", port: 3000 });

    expect(app.listen).toHaveBeenCalledWith(3000, "127.0.0.1", expect.any(Function));

    await adapter.close();
    expect(close).toHaveBeenCalledTimes(1);

    await adapter.close();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
