import "reflect-metadata";
import { HANDLERS_KEY, RUNNERS_KEY } from "@xtaskjs/common";
import { registerEventHandlers } from "../../src/server/registereventhandlers";

describe("registerEventHandlers", () => {
  it("should register lifecycle handlers and runners sorted by priority", async () => {
    class TestListener {
      calls: string[] = [];

      high(payload?: any) {
        this.calls.push(`high:${payload}`);
      }

      low(payload?: any) {
        this.calls.push(`low:${payload}`);
      }

      runApp(...args: string[]) {
        this.calls.push(`app:${args.join(",")}`);
      }

      runCli(...args: string[]) {
        this.calls.push(`cli:${args.join(",")}`);
      }
    }

    Reflect.defineMetadata(
      HANDLERS_KEY,
      [
        { phase: "starting", method: "low", priority: 1 },
        { phase: "starting", method: "high", priority: 10 },
      ],
      TestListener
    );

    Reflect.defineMetadata(
      RUNNERS_KEY,
      [
        { type: "ApplicationRunner", method: "runApp", priority: 1 },
        { type: "CommandLineRunner", method: "runCli", priority: 2 },
      ],
      TestListener
    );

    const listener = new TestListener();

    const app = {
      on: jest.fn(),
      registerRunner: jest.fn(),
    } as any;

    registerEventHandlers(listener, app);

    expect(app.on).toHaveBeenCalledTimes(2);
    expect(app.registerRunner).toHaveBeenCalledTimes(2);

    const highHandler = app.on.mock.calls[0][1];
    const lowHandler = app.on.mock.calls[1][1];

    await highHandler("x");
    await lowHandler("x");

    expect(listener.calls).toContain("high:x");
    expect(listener.calls).toContain("low:x");

    const cliRunner = app.registerRunner.mock.calls[0][0];
    const appRunner = app.registerRunner.mock.calls[1][0];

    appRunner(["a"]);
    cliRunner(["b"]);

    expect(listener.calls).toContain("app:a");
    expect(listener.calls).toContain("cli:b");
  });

  it("should tolerate missing metadata", () => {
    class Empty {}
    const instance = new Empty();
    const app = { on: jest.fn(), registerRunner: jest.fn() } as any;

    registerEventHandlers(instance, app);

    expect(app.on).not.toHaveBeenCalled();
    expect(app.registerRunner).not.toHaveBeenCalled();
  });
});
