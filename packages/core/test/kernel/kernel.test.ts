import { join } from "path";

jest.mock("fs", () => ({
  existsSync: jest.fn(),
}));

jest.mock("../../src/di/container", () => ({
  Container: jest.fn(),
}));

jest.mock("../../src/kernel/manifest-cache.service", () => ({
  ManifestCacheService: jest.fn(),
}));

const hotWatcherStart = jest.fn();
const hotWatcherStop = jest.fn();
const HotManifestWatcherMock = jest.fn(() => ({
  start: hotWatcherStart,
  stop: hotWatcherStop,
}));

jest.mock("../../src/watcher", () => ({
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
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  beforeEach(() => {
    hotWatcherStart.mockClear();
    hotWatcherStop.mockClear();
    HotManifestWatcherMock.mockClear();
  });

  it("should autoload from manifest cache when available", async () => {
    const autoloadFiles = jest.fn(async () => {});
    const scanDir = jest.fn(async () => []);
    const logger = { info: jest.fn() };
    const get = jest.fn(async () => logger);
    const emit = jest.fn(async () => {});

    const manifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      scanRoots: ["/project/src"],
      files: ["/project/src/app.service.ts"],
    };

    (Container as unknown as jest.Mock).mockImplementation(() => ({
      autoloadFiles,
      scanDir,
      get,
    }));

    (existsSync as jest.Mock).mockImplementation(() => true);

    const read = jest.fn(() => manifest);
    const readPrebuilt = jest.fn(() => null);
    const write = jest.fn();
    const getManifestPath = jest.fn(() => "/project/.xtask-manifest.json");
    const getPrebuiltManifestPath = jest.fn(() => "/project/.xtask-manifest.prebuilt.json");
    (ManifestCacheService as unknown as jest.Mock).mockImplementation(() => ({
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
    const autoloadFiles = jest.fn(async () => {});
    const scanDir = jest.fn(async (dir: string) => [join(dir, "component.ts")]);
    const logger = { info: jest.fn() };
    const emit = jest.fn(async () => {});

    (Container as unknown as jest.Mock).mockImplementation(() => ({
      autoloadFiles,
      scanDir,
      get: jest.fn(async () => logger),
    }));

    (existsSync as jest.Mock).mockImplementation(() => true);

    const read = jest.fn(() => null);
    const readPrebuilt = jest.fn(() => null);
    const write = jest.fn();
    const getManifestPath = jest.fn(() => "/project/.xtask-manifest.json");
    const getPrebuiltManifestPath = jest.fn(() => "/project/.xtask-manifest.prebuilt.json");
    (ManifestCacheService as unknown as jest.Mock).mockImplementation(() => ({
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
    const autoloadFiles = jest.fn()
      .mockRejectedValueOnce(new Error("Cannot find module"))
      .mockResolvedValue(undefined);
    const scanDir = jest.fn(async (dir: string) => [join(dir, "fresh.ts")]);
    const logger = { info: jest.fn() };
    const emit = jest.fn(async () => {});

    (Container as unknown as jest.Mock).mockImplementation(() => ({
      autoloadFiles,
      scanDir,
      get: jest.fn(async () => logger),
    }));

    (existsSync as jest.Mock).mockImplementation(() => true);

    const manifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      scanRoots: ["/project/src"],
      files: ["/project/src/missing.ts"],
    };
    const read = jest.fn(() => manifest);
    const readPrebuilt = jest.fn(() => null);
    const write = jest.fn();
    const getManifestPath = jest.fn(() => "/project/.xtask-manifest.json");
    const getPrebuiltManifestPath = jest.fn(() => "/project/.xtask-manifest.prebuilt.json");
    (ManifestCacheService as unknown as jest.Mock).mockImplementation(() => ({
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
      autoloadFiles: jest.fn(async () => {}),
      scanDir: jest.fn(async () => []),
      get: jest.fn(async () => ({ info: jest.fn() })),
    };

    (Container as unknown as jest.Mock).mockImplementation(() => container);
    (existsSync as jest.Mock).mockImplementation(() => false);

    (ManifestCacheService as unknown as jest.Mock).mockImplementation(() => ({
      read: jest.fn(() => null),
      readPrebuilt: jest.fn(() => null),
      write: jest.fn(),
      getManifestPath: jest.fn(() => "/project/.xtask-manifest.json"),
      getPrebuiltManifestPath: jest.fn(() => "/project/.xtask-manifest.prebuilt.json"),
    }));

    const kernel = new Kernel();
    await kernel.boot();

    expect(await kernel.getContainer()).toBe(container);
  });

  it("should prefer prebuilt manifest over cache when enabled", async () => {
    const autoloadFiles = jest.fn(async () => {});
    const scanDir = jest.fn(async () => []);
    const logger = { info: jest.fn() };
    const emit = jest.fn(async () => {});

    const prebuiltManifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      scanRoots: ["/project/src"],
      files: ["/project/src/prebuilt.service.ts"],
    };

    (Container as unknown as jest.Mock).mockImplementation(() => ({
      autoloadFiles,
      scanDir,
      get: jest.fn(async () => logger),
    }));

    (existsSync as jest.Mock).mockImplementation(() => true);

    const read = jest.fn(() => ({
      version: 1,
      generatedAt: new Date().toISOString(),
      scanRoots: ["/project/src"],
      files: ["/project/src/cache.service.ts"],
    }));
    const readPrebuilt = jest.fn(() => prebuiltManifest);
    const write = jest.fn();
    const getManifestPath = jest.fn(() => "/project/.xtask-manifest.json");
    const getPrebuiltManifestPath = jest.fn(() => "/project/.xtask-manifest.prebuilt.json");

    (ManifestCacheService as unknown as jest.Mock).mockImplementation(() => ({
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
    const autoloadFiles = jest.fn(async () => {});
    const scanDir = jest.fn(async () => []);
    const logger = { info: jest.fn() };
    const emit = jest.fn(async () => {});
    const on = jest.fn();

    const manifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      scanRoots: ["/project/src"],
      files: ["/project/src/app.service.ts"],
    };

    (Container as unknown as jest.Mock).mockImplementation(() => ({
      autoloadFiles,
      scanDir,
      get: jest.fn(async () => logger),
    }));

    (existsSync as jest.Mock).mockImplementation(() => true);

    (ManifestCacheService as unknown as jest.Mock).mockImplementation(() => ({
      read: jest.fn(() => manifest),
      readPrebuilt: jest.fn(() => null),
      write: jest.fn(),
      getManifestPath: jest.fn(() => "/project/.xtask-manifest.json"),
      getPrebuiltManifestPath: jest.fn(() => "/project/.xtask-manifest.prebuilt.json"),
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
