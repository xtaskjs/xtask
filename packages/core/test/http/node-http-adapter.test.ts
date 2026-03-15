jest.mock("http", () => ({
  createServer: jest.fn(),
}));

import { createServer } from "http";
import { NodeHttpAdapter } from "../../src/http/node-http-adapter";

describe("NodeHttpAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw if no handler was registered", async () => {
    const adapter = new NodeHttpAdapter();
    await expect(adapter.listen({ host: "127.0.0.1", port: 3000 })).rejects.toThrow(
      "No request handler registered for node-http adapter"
    );
  });

  it("should create server and handle unsupported methods", async () => {
    let serverCallback: any;
    const server = {
      once: jest.fn(),
      listen: jest.fn((_port, _host, callback) => callback()),
      close: jest.fn((callback) => callback()),
    };

    (createServer as jest.Mock).mockImplementation((callback) => {
      serverCallback = callback;
      return server;
    });

    const adapter = new NodeHttpAdapter();
    adapter.registerRequestHandler(jest.fn(async () => {}));

    await adapter.listen({ host: "127.0.0.1", port: 3000 });

    const req = { method: "PUT", url: "/x", headers: { host: "localhost" } };
    const res = { statusCode: 200, end: jest.fn(), setHeader: jest.fn() };

    await serverCallback(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.end).toHaveBeenCalledWith("Method Not Allowed");
  });

  it("should dispatch valid requests to registered handler", async () => {
    let serverCallback: any;
    const server = {
      once: jest.fn(),
      listen: jest.fn((_port, _host, callback) => callback()),
      close: jest.fn((callback) => callback()),
    };

    (createServer as jest.Mock).mockImplementation((callback) => {
      serverCallback = callback;
      return server;
    });

    const handler = jest.fn(async () => {});
    const adapter = new NodeHttpAdapter();
    adapter.registerRequestHandler(handler);

    await adapter.listen({ host: "127.0.0.1", port: 3000 });

    const req = { method: "GET", url: "/health?x=1", headers: { host: "localhost" } };
    const res = { statusCode: 200, end: jest.fn(), setHeader: jest.fn() };

    await serverCallback(req, res);

    expect(handler).toHaveBeenCalledWith("GET", "/health", req, res);
    expect((req as any).query).toEqual({ x: "1" });
    expect((req as any).path).toBe("/health");
  });

  it("should parse json bodies before dispatching", async () => {
    let serverCallback: any;
    const server = {
      once: jest.fn(),
      listen: jest.fn((_port, _host, callback) => callback()),
      close: jest.fn((callback) => callback()),
    };

    (createServer as jest.Mock).mockImplementation((callback) => {
      serverCallback = callback;
      return server;
    });

    const handler = jest.fn(async () => {});
    const adapter = new NodeHttpAdapter();
    adapter.registerRequestHandler(handler);

    await adapter.listen({ host: "127.0.0.1", port: 3000 });

    const req = {
      method: "POST",
      url: "/users",
      headers: { host: "localhost", "content-type": "application/json" },
      async *[Symbol.asyncIterator]() {
        yield Buffer.from('{"name":"Ada"}');
      },
    };
    const res = { statusCode: 200, end: jest.fn(), setHeader: jest.fn() };

    await serverCallback(req, res);

    expect((req as any).body).toEqual({ name: "Ada" });
    expect(handler).toHaveBeenCalledWith("POST", "/users", req, res);
  });

  it("should return 400 for invalid json bodies", async () => {
    let serverCallback: any;
    const server = {
      once: jest.fn(),
      listen: jest.fn((_port, _host, callback) => callback()),
      close: jest.fn((callback) => callback()),
    };

    (createServer as jest.Mock).mockImplementation((callback) => {
      serverCallback = callback;
      return server;
    });

    const adapter = new NodeHttpAdapter();
    adapter.registerRequestHandler(jest.fn(async () => {}));

    await adapter.listen({ host: "127.0.0.1", port: 3000 });

    const req = {
      method: "POST",
      url: "/users",
      headers: { host: "localhost", "content-type": "application/json" },
      async *[Symbol.asyncIterator]() {
        yield Buffer.from('{"name":');
      },
    };
    const res = { statusCode: 200, end: jest.fn(), setHeader: jest.fn() };

    await serverCallback(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ message: "Invalid JSON body", error: "Invalid JSON body" })
    );
  });

  it("should return 500 when request handling throws", async () => {
    let serverCallback: any;
    const server = {
      once: jest.fn(),
      listen: jest.fn((_port, _host, callback) => callback()),
      close: jest.fn((callback) => callback()),
    };

    (createServer as jest.Mock).mockImplementation((callback) => {
      serverCallback = callback;
      return server;
    });

    const handler = jest.fn(async () => {
      throw new Error("boom");
    });

    const adapter = new NodeHttpAdapter();
    adapter.registerRequestHandler(handler);

    await adapter.listen({ host: "127.0.0.1", port: 3000 });

    const req = { method: "GET", url: "/health", headers: { host: "localhost" } };
    const res = { statusCode: 200, end: jest.fn(), setHeader: jest.fn() };

    await serverCallback(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.setHeader).toHaveBeenCalledWith("content-type", "application/json");
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ message: "Internal Server Error", error: "boom" })
    );
  });

  it("should close safely with and without a server", async () => {
    let serverCallback: any;
    const server = {
      once: jest.fn(),
      listen: jest.fn((_port, _host, callback) => callback()),
      close: jest.fn((callback) => callback()),
    };

    (createServer as jest.Mock).mockImplementation((callback) => {
      serverCallback = callback;
      return server;
    });

    const adapter = new NodeHttpAdapter();
    adapter.registerRequestHandler(jest.fn(async () => {}));

    await adapter.close();
    await adapter.listen({ host: "127.0.0.1", port: 3000 });
    await adapter.close();

    expect(serverCallback).toBeDefined();
    expect(server.close).toHaveBeenCalledTimes(1);
  });
});
