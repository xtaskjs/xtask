jest.mock("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

import { existsSync, readFileSync, writeFileSync } from "fs";
import { ManifestCacheService } from "../../src/kernel/manifest-cache.service";

describe("ManifestCacheService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return null when manifest file does not exist", () => {
    (existsSync as jest.Mock).mockReturnValue(false);
    const service = new ManifestCacheService("/project");

    const manifest = service.read(["/project/src"]);

    expect(manifest).toBeNull();
  });

  it("should write manifest with normalized roots and files", () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    const service = new ManifestCacheService("/project");

    const manifest = service.write([
      "/project/src",
      "/project/src",
      "/project/packages",
    ], [
      "/project/src/a.ts",
      "/project/src/a.ts",
      "/project/packages/b.ts",
    ]);

    expect(manifest.scanRoots).toEqual(["/project/packages", "/project/src"]);
    expect(manifest.files).toEqual(["/project/packages/b.ts", "/project/src/a.ts"]);
    expect(writeFileSync).toHaveBeenCalledTimes(1);
  });

  it("should return null when scan roots do not match", () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify({
        version: 1,
        generatedAt: new Date().toISOString(),
        scanRoots: ["/project/src"],
        files: ["/project/src/a.ts"],
      })
    );

    const service = new ManifestCacheService("/project");
    const manifest = service.read(["/project/packages"]);

    expect(manifest).toBeNull();
  });
});