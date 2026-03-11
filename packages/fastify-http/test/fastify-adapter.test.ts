import { FastifyAdapter } from "../src/fastify-adapter";
import { view } from "../src/types";
import fs from "fs";
import os from "os";
import path from "path";

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

    expect(handler).toHaveBeenCalledWith(
      "GET",
      "/health",
      request,
      expect.objectContaining({ send: expect.any(Function), json: expect.any(Function) })
    );
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

  it("should render view with custom renderer", async () => {
    const app = {
      route: jest.fn(),
      listen: jest.fn(async () => {}),
      close: jest.fn(async () => {}),
    };

    const adapter = new FastifyAdapter(app, {
      templateEngine: {
        render: async (_template, model) => `<h1>${model.title}</h1>`,
      },
      staticFiles: {
        enabled: false,
      },
    });

    const reply = {
      code: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as any;

    await adapter.renderView!({}, reply, view("home", { title: "Fastify" }, 201));

    expect(reply.code).toHaveBeenCalledWith(201);
    expect(reply.header).toHaveBeenCalledWith("content-type", "text/html; charset=utf-8");
    expect(reply.send).toHaveBeenCalledWith("<h1>Fastify</h1>");
  });

  it("should render templates from views folder by default", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "xtaskjs-fastify-view-"));
    const viewsPath = path.join(tempRoot, "views");
    fs.mkdirSync(viewsPath, { recursive: true });
    fs.writeFileSync(path.join(viewsPath, "home.html"), "<h1>{{title}}</h1>", "utf-8");

    const app = {
      route: jest.fn(),
      listen: jest.fn(async () => {}),
      close: jest.fn(async () => {}),
    };

    const adapter = new FastifyAdapter(app, {
      templateEngine: {
        viewsPath,
      },
      staticFiles: {
        enabled: false,
      },
    });

    const reply = {
      header: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as any;

    await adapter.renderView!({}, reply, view("home", { title: "From File" }));

    expect(reply.send).toHaveBeenCalledWith("<h1>From File</h1>");
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("should serve static files from public folder", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "xtaskjs-fastify-public-"));
    const publicPath = path.join(tempRoot, "public");
    fs.mkdirSync(publicPath, { recursive: true });
    fs.writeFileSync(path.join(publicPath, "app.css"), "body { color: red; }", "utf-8");

    let routeConfig: any;
    const app = {
      route: jest.fn((config) => {
        routeConfig = config;
      }),
      listen: jest.fn(async () => {}),
      close: jest.fn(async () => {}),
    };

    const adapter = new FastifyAdapter(app, {
      staticFiles: {
        publicPath,
      },
    });

    const handler = jest.fn(async () => {});
    adapter.registerRequestHandler(handler);

    const request = { method: "GET", url: "/app.css" };
    const reply = {
      header: jest.fn().mockReturnThis(),
      send: jest.fn(),
      code: jest.fn().mockReturnThis(),
    };
    await routeConfig.handler(request, reply);

    expect(reply.header).toHaveBeenCalledWith("content-type", "text/css; charset=utf-8");
    expect(reply.send).toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});
