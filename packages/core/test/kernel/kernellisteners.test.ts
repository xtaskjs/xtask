import { KernelListeners } from "../../src/kernel/kernellisteners";

describe("KernelListeners", () => {
  const previousNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.XTASKJS_SHOW_METRICS_LOGS;
    process.env.NODE_ENV = previousNodeEnv;
  });

  it("should log lifecycle and runner messages", async () => {
    process.env.NODE_ENV = "development";
    const spy = jest.spyOn(console, "log").mockImplementation();
    const listeners = new KernelListeners();

    listeners.onStarting();
    listeners.onReady();
    await listeners.afterStart();
    await listeners.cli(["--x"]);

    expect(spy).toHaveBeenCalledWith("[Lifecycle] Starting...");
    expect(spy).toHaveBeenCalledWith("[Lifecycle] Application ready!");
    expect(spy).toHaveBeenCalledWith("[Runner] ApplicationRunner ejecutado después de arrancar Kernel");
    expect(spy).toHaveBeenCalledWith("[Runner] CommandLineRunner con args:", ["--x"]);
  });

  it("should hide metrics logs by default", () => {
    process.env.NODE_ENV = "development";
    const spy = jest.spyOn(console, "log").mockImplementation();
    const listeners = new KernelListeners();

    listeners.memory({ heapUsed: 1024 * 1024 } as any);
    listeners.cpu({ user: 1, system: 2 } as any);

    expect(spy).not.toHaveBeenCalledWith("[Metrics] Heap MB:", expect.any(String));
    expect(spy).not.toHaveBeenCalledWith("CPU", expect.anything());
  });

  it("should show metrics logs when enabled", () => {
    process.env.NODE_ENV = "development";
    process.env.XTASKJS_SHOW_METRICS_LOGS = "true";
    const spy = jest.spyOn(console, "log").mockImplementation();
    const listeners = new KernelListeners();

    listeners.memory({ heapUsed: 2 * 1024 * 1024 } as any);
    listeners.cpu({ user: 1, system: 2 } as any);

    expect(spy).toHaveBeenCalledWith("[Metrics] Heap MB:", "2.00");
    expect(spy).toHaveBeenCalledWith("CPU", { user: 1, system: 2 });
  });
});
