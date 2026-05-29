import { join } from "path";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("../../src/di/container", () => ({
  Container: vi.fn(),
}));

vi.mock("../../src/kernel/manifest-cache.service", () => ({
  ManifestCacheService: vi.fn(),
}));

const hotWatcherStart = vi.fn();
const hotWatcherStop = vi.fn();
const HotManifestWatcherMock = vi.fn(() => ({
  start: hotWatcherStart,
  stop: hotWatcherStop,
}));

vi.mock("../../src/watcher", () => ({
  HotManifestWatcher: function (...args: any[]) {
    return HotManifestWatcherMock.apply(null, args as any);
  },
}));

import { existsSync } from "fs";
import { Container } from "../../src/di/container";
import { Kernel } from "../../src/kernel/kernel";
import { ManifestCacheService } from "../../src/kernel/manifest-cache.service";

describe("Kernel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    hotWatcherStart.mockClear();
    hotWatcherStop.mockClear();
    HotManifestWatcherMock.mockClear();
  });

  it("should autoload from manifest cache when available", async () => {
    const autoloadFiles = vi.fn(async () => {});
    const scanDir = vi.fn(async () => []);
    const logger = { info: vi.fn() };
    const get = vi.fn(async () => logger);
    const emit = vi.fn(async () => {});

    const manifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      scanRoots: ["/project/src"],
      files: ["/project/src/app.service.ts"],
    };

    vi.mocked(Container).mockImplementation(() => ({
      autoloadFiles,
      scanDir,
      get,
    }));

    vi.mocked(existsSync).mockImplementation(() => true);

    const read = vi.fn(() => manifest);
    const readPrebuilt = vi.fn(() => null);
    const write = vi.fn();
    const getManifestPath = vi.fn(() => "/project/.xtask-manifest.json");
    const getPrebuiltManifestPath = vi.fn(() => "/project/.xtask-manifest.prebuilt.json");
    vi.mocked(ManifestCacheService).mockImplementation(() => ({
      read,
      readPrebuilt,
      write,
      getManifestPath,
      getPrebuiltManifestPath,
    }));

    const kernel = new Kernel();
    await kernel.boot({ emit } as any);

    expect(read).toHaveBeenCalledTimes(1);
    expect(autoloadFiles).toHaveBeenCalledWith(manifest.files);
    expect(scanDir).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith("manifestCacheHit", {
      path: "/project/.xtask-manifest.json",
      fileCount: 1,
      source: "cache",
    });
    expect(get).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith("🚀 Kernel started successfully.");
  });

  it("should rebuild manifest on cache miss", async () => {
    const autoloadFiles = vi.fn(async () => {});
    const scanDir = vi.fn(async (dir: string) => [join(dir, "component.ts")]);
    const logger = { info: vi.fn() };
    const emit = vi.fn(async () => {});

    vi.mocked(Container).mockImplementation(() => ({
      autoloadFiles,
      scanDir,
      get: vi.fn(async () => logger),
    }));

    vi.mocked(existsSync).mockImplementation(() => true);

    const read = vi.fn(() => null);
    const readPrebuilt = vi.fn(() => null);
    const write = vi.fn();
    const getManifestPath = vi.fn(() => "/project/.xtask-manifest.json");
    const getPrebuiltManifestPath = vi.fn(() => "/project/.xtask-manifest.prebuilt.json");
    vi.mocked(ManifestCacheService).mockImplementation(() => ({
      read,
      readPrebuilt,
      write,
      getManifestPath,
      getPrebuiltManifestPath,
    }));

    const kernel = new Kernel();
    await kernel.boot({ emit } as any);

    expect(read).toHaveBeenCalledTimes(1);
    expect(scanDir).toHaveBeenCalledTimes(3);
    expect(autoloadFiles).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("manifestCacheMiss", {
      path: "/project/.xtask-manifest.json",
    });
    expect(emit).toHaveBeenCalledWith("manifestCacheRebuilt", expect.objectContaining({
      fileCount: 3,
    }));
  });

  it("should fallback to rebuild when manifest cache is stale", async () => {
    const autoloadFiles = vi.fn()
      .mockRejectedValueOnce(new Error("Cannot find module"))
      .mockResolvedValue(undefined);
    const scanDir = vi.fn(async (dir: string) => [join(dir, "fresh.ts")]);
    const logger = { info: vi.fn() };
    const emit = vi.fn(async () => {});

    vi.mocked(Container).mockImplementation(() => ({
      autoloadFiles,
      scanDir,
      get: vi.fn(async () => logger),
    }));

    vi.mocked(existsSync).mockImplementation(() => true);

    const manifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      scanRoots: ["/project/src"],
      files: ["/project/src/missing.ts"],
    };
    const read = vi.fn(() => manifest);
    const readPrebuilt = vi.fn(() => null);
    const write = vi.fn();
    const getManifestPath = vi.fn(() => "/project/.xtask-manifest.json");
    const getPrebuiltManifestPath = vi.fn(() => "/project/.xtask-manifest.prebuilt.json");
    vi.mocked(ManifestCacheService).mockImplementation(() => ({
      read,
      readPrebuilt,
      write,
      getManifestPath,
      getPrebuiltManifestPath,
    }));

    const kernel = new Kernel();
    await kernel.boot({ emit } as any);

    expect(autoloadFiles).toHaveBeenCalledTimes(2);
    expect(scanDir).toHaveBeenCalledTimes(3);
    expect(write).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("manifestCacheInvalid", {
      path: "/project/.xtask-manifest.json",
      reason: "Cannot find module",
      source: "cache",
    });
  });

  it("should expose container instance", async () => {
    const container = {
      autoloadFiles: vi.fn(async () => {}),
      scanDir: vi.fn(async () => []),
      get: vi.fn(async () => ({ info: vi.fn() })),
    };

    vi.mocked(Container).mockImplementation(() => container);
    vi.mocked(existsSync).mockImplementation(() => false);

    vi.mocked(ManifestCacheService).mockImplementation(() => ({
      read: vi.fn(() => null),
      readPrebuilt: vi.fn(() => null),
      write: vi.fn(),
      getManifestPath: vi.fn(() => "/project/.xtask-manifest.json"),
      getPrebuiltManifestPath: vi.fn(() => "/project/.xtask-manifest.prebuilt.json"),
    }));

    const kernel = new Kernel();
    await kernel.boot();

    expect(await kernel.getContainer()).toBe(container);
  });

  it("should prefer prebuilt manifest over cache when enabled", async () => {
    const autoloadFiles = vi.fn(async () => {});
    const scanDir = vi.fn(async () => []);
    const logger = { info: vi.fn() };
    const emit = vi.fn(async () => {});

    const prebuiltManifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      scanRoots: ["/project/src"],
      files: ["/project/src/prebuilt.service.ts"],
    };

    vi.mocked(Container).mockImplementation(() => ({
      autoloadFiles,
      scanDir,
      get: vi.fn(async () => logger),
    }));

    vi.mocked(existsSync).mockImplementation(() => true);

    const read = vi.fn(() => ({
      version: 1,
      generatedAt: new Date().toISOString(),
      scanRoots: ["/project/src"],
      files: ["/project/src/cache.service.ts"],
    }));
    const readPrebuilt = vi.fn(() => prebuiltManifest);
    const write = vi.fn();
    const getManifestPath = vi.fn(() => "/project/.xtask-manifest.json");
    const getPrebuiltManifestPath = vi.fn(() => "/project/.xtask-manifest.prebuilt.json");

    vi.mocked(ManifestCacheService).mockImplementation(() => ({
      read,
      readPrebuilt,
      write,
      getManifestPath,
      getPrebuiltManifestPath,
    }));

    const kernel = new Kernel({
      prebuiltManifest: { enabled: true },
    });
    await kernel.boot({ emit } as any);

    expect(readPrebuilt).toHaveBeenCalledTimes(1);
    expect(read).not.toHaveBeenCalled();
    expect(autoloadFiles).toHaveBeenCalledWith(prebuiltManifest.files);
    expect(emit).toHaveBeenCalledWith("manifestCacheHit", {
      path: "/project/.xtask-manifest.prebuilt.json",
      fileCount: 1,
      source: "prebuilt",
    });
    expect(write).not.toHaveBeenCalled();
    expect(scanDir).not.toHaveBeenCalled();
  });

  it("should emit hot manifest watcher lifecycle events", async () => {
    const autoloadFiles = vi.fn(async () => {});
    const scanDir = vi.fn(async () => []);
    const logger = { info: vi.fn() };
    const emit = vi.fn(async () => {});
    const on = vi.fn();

    const manifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      scanRoots: ["/project/src"],
      files: ["/project/src/app.service.ts"],
    };

    vi.mocked(Container).mockImplementation(() => ({
      autoloadFiles,
      scanDir,
      get: vi.fn(async () => logger),
    }));

    vi.mocked(existsSync).mockImplementation(() => true);

    vi.mocked(ManifestCacheService).mockImplementation(() => ({
      read: vi.fn(() => manifest),
      readPrebuilt: vi.fn(() => null),
      write: vi.fn(),
      getManifestPath: vi.fn(() => "/project/.xtask-manifest.json"),
      getPrebuiltManifestPath: vi.fn(() => "/project/.xtask-manifest.prebuilt.json"),
    }));

    const kernel = new Kernel({
      hotManifestWatcher: { enabled: true, debounceMs: 80 },
    });
    await kernel.boot({ emit, on } as any);

    expect(HotManifestWatcherMock).toHaveBeenCalledTimes(1);
    expect(hotWatcherStart).toHaveBeenCalledTimes(1);

    const watcherOptions = (HotManifestWatcherMock as any).mock.calls[0][4] as {
      onHotUpdate?: (payload: any) => Promise<void>;
      onMetrics?: (payload: any) => Promise<void>;
      onReloadError?: (payload: any) => Promise<void>;
    };
    await watcherOptions.onHotUpdate?.({ file: "a.ts" });
    await watcherOptions.onMetrics?.({ source: "update" });
    await watcherOptions.onReloadError?.({ file: "a.ts", error: "boom" });

    expect(emit).toHaveBeenCalledWith("hotManifestUpdated", { file: "a.ts" });
    expect(emit).toHaveBeenCalledWith("hotManifestMetrics", { source: "update" });
    expect(emit).toHaveBeenCalledWith("hotManifestReloadError", { file: "a.ts", error: "boom" });

    expect(on).toHaveBeenCalledTimes(1);
    const stopHandler = on.mock.calls[0][1];
    await stopHandler();
    expect(hotWatcherStop).toHaveBeenCalledTimes(1);
  });
});
