import { FastifyAdapter } from "../../src/http/fastify-adapter";

describe("FastifyAdapter", () => {
  it("should throw when fastify instance is invalid", () => {
    expect(() => new FastifyAdapter({})).toThrow(
      "FastifyAdapter requires a valid fastify instance"
    );
  });

  it("should register wildcard route and dispatch supported methods", async () => {
    let routeConfig: any;
    const app = {
      route: jest.fn((config) => {
        routeConfig = config;
      }),
      listen: jest.fn(async () => {}),
      close: jest.fn(async () => {}),
    };

    const adapter = new FastifyAdapter(app);
    const handler = jest.fn(async () => {});

    adapter.registerRequestHandler(handler);

    expect(app.route).toHaveBeenCalledTimes(1);
    expect(routeConfig.url).toBe("*");

    const request = { method: "GET", url: "/health" };
    const reply = { code: jest.fn().mockReturnThis(), send: jest.fn() };
    await routeConfig.handler(request, reply);

    expect(handler).toHaveBeenCalledWith("GET", "/health", request, reply);
  });

  it("should return 405 for unsupported methods", async () => {
    let routeConfig: any;
    const app = {
      route: jest.fn((config) => {
        routeConfig = config;
      }),
      listen: jest.fn(async () => {}),
      close: jest.fn(async () => {}),
    };

    const adapter = new FastifyAdapter(app);
    adapter.registerRequestHandler(jest.fn(async () => {}));

    const request = { method: "PUT", url: "/health" };
    const reply = { code: jest.fn().mockReturnThis(), send: jest.fn() };
    await routeConfig.handler(request, reply);

    expect(reply.code).toHaveBeenCalledWith(405);
    expect(reply.send).toHaveBeenCalledWith("Method Not Allowed");
  });

  it("should listen and close", async () => {
    const app = {
      route: jest.fn(),
      listen: jest.fn(async () => {}),
      close: jest.fn(async () => {}),
    };

    const adapter = new FastifyAdapter(app);
    await adapter.listen({ host: "127.0.0.1", port: 3000 });
    await adapter.close();

    expect(app.listen).toHaveBeenCalledWith({ port: 3000, host: "127.0.0.1" });
    expect(app.close).toHaveBeenCalledTimes(1);
  });
});
