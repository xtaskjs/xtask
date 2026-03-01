import { ExpressAdapter } from "../src/express-adapter";
import { view } from "../src/types";

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

  it("should configure express native template engine", () => {
    const app = {
      use: jest.fn(),
      listen: jest.fn(),
      set: jest.fn(),
      engine: jest.fn(),
    };

    new ExpressAdapter(app, {
      templateEngine: {
        viewsPath: "./views",
        extension: "hbs",
        engine: jest.fn(),
        viewEngine: "hbs",
      },
    });

    expect(app.set).toHaveBeenCalledWith("views", "./views");
    expect(app.engine).toHaveBeenCalledWith("hbs", expect.any(Function));
    expect(app.set).toHaveBeenCalledWith("view engine", "hbs");
  });

  it("should render view with custom html renderer", async () => {
    const app = {
      use: jest.fn(),
      listen: jest.fn(),
      set: jest.fn(),
      engine: jest.fn(),
    };

    const adapter = new ExpressAdapter(app, {
      templateEngine: {
        render: async (_template, model) => `<html><body><h1>${model.title}</h1></body></html>`,
      },
    });

    const res = { send: jest.fn(), status: jest.fn().mockReturnThis() } as any;
    await adapter.renderView!({}, res, view("home", { title: "XTask" }, 201));

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith("<html><body><h1>XTask</h1></body></html>");
  });

  it("should render view through express res.render", async () => {
    const app = {
      use: jest.fn(),
      listen: jest.fn(),
    };

    const adapter = new ExpressAdapter(app);
    const send = jest.fn();
    const render = jest.fn((_template, _model, cb) => cb(null, "<html>ok</html>"));
    const res = { render, send } as any;

    await adapter.renderView!({}, res, view("dashboard", { ok: true }));

    expect(render).toHaveBeenCalledWith("dashboard", { ok: true }, expect.any(Function));
    expect(send).toHaveBeenCalledWith("<html>ok</html>");
  });
});
