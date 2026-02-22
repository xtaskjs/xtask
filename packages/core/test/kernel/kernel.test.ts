jest.mock("fs", () => ({
  existsSync: jest.fn(),
}));

jest.mock("../../src/di/container", () => ({
  Container: jest.fn(),
}));

import { existsSync } from "fs";
import { Container } from "../../src/di/container";
import { Kernel } from "../../src/kernel/kernel";

describe("Kernel", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should autoload existing dirs and start logger", async () => {
    const autoload = jest.fn(async () => {});
    const logger = { info: jest.fn() };
    const get = jest.fn(async () => logger);

    (Container as unknown as jest.Mock).mockImplementation(() => ({
      autoload,
      get,
    }));

    (existsSync as jest.Mock).mockImplementation(() => true);

    const timeoutSpy = jest.spyOn(global, "setTimeout").mockImplementation((fn: any) => {
      fn();
      return 0 as any;
    });

    const kernel = new Kernel();
    await kernel.boot();

    expect(autoload).toHaveBeenCalledTimes(3);
    expect(get).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith("🚀 Kernel started successfully.");

    timeoutSpy.mockRestore();
  });

  it("should skip missing dirs", async () => {
    const autoload = jest.fn(async () => {});
    const logger = { info: jest.fn() };

    (Container as unknown as jest.Mock).mockImplementation(() => ({
      autoload,
      get: jest.fn(async () => logger),
    }));

    let index = 0;
    (existsSync as jest.Mock).mockImplementation(() => {
      index += 1;
      return index === 2;
    });

    const timeoutSpy = jest.spyOn(global, "setTimeout").mockImplementation((fn: any) => {
      fn();
      return 0 as any;
    });

    const kernel = new Kernel();
    await kernel.boot();

    expect(autoload).toHaveBeenCalledTimes(1);

    timeoutSpy.mockRestore();
  });

  it("should expose container instance", async () => {
    const container = {
      autoload: jest.fn(async () => {}),
      get: jest.fn(async () => ({ info: jest.fn() })),
    };

    (Container as unknown as jest.Mock).mockImplementation(() => container);
    (existsSync as jest.Mock).mockImplementation(() => false);

    const timeoutSpy = jest.spyOn(global, "setTimeout").mockImplementation((fn: any) => {
      fn();
      return 0 as any;
    });

    const kernel = new Kernel();
    await kernel.boot();

    expect(await kernel.getContainer()).toBe(container);

    timeoutSpy.mockRestore();
  });
});
