vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { existsSync, readFileSync, writeFileSync } from "fs";
import { ManifestCacheService } from "../../src/kernel/manifest-cache.service";

describe("ManifestCacheService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when manifest file does not exist", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const service = new ManifestCacheService("/project");

    const manifest = service.read(["/project/src"]);

    expect(manifest).toBeNull();
  });

  it("should write manifest with normalized roots and files", () => {
    vi.mocked(existsSync).mockReturnValue(true);
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

  it("should write prebuilt manifest to dedicated file", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const service = new ManifestCacheService("/project");

    const manifest = service.writePrebuilt(["/project/src"], ["/project/src/a.ts"]);

    expect(manifest.scanRoots).toEqual(["/project/src"]);
    expect(writeFileSync).toHaveBeenCalledWith(
      "/project/.xtask-manifest.prebuilt.json",
      expect.any(String),
      "utf8"
    );
  });

  it("should read prebuilt manifest when valid", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        version: 1,
        generatedAt: new Date().toISOString(),
        scanRoots: ["/project/src"],
        files: ["/project/src/a.ts"],
      })
    );

    const service = new ManifestCacheService("/project");
    const manifest = service.readPrebuilt(["/project/src"]);

    expect(manifest).toEqual(expect.objectContaining({
      scanRoots: ["/project/src"],
      files: ["/project/src/a.ts"],
    }));
  });

  it("should return null when scan roots do not match", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
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