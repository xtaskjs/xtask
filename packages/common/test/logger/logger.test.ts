import { Logger } from "../../src/logger/logger";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("Logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Should print formatted logs with colors", () => {
    const logger = new Logger({
      appName: "xTaskjs",
      context: "MyService",
      useColors: true,
    });

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_713_516_000_000);

    const spy = vi.spyOn(console, "log").mockImplementation();

    logger.info("hello");
    nowSpy.mockReturnValue(1_713_516_000_005);
    logger.info("world");

    expect(spy).toHaveBeenCalledTimes(2);

    const firstCall = spy.mock.calls[0][0] as string;
    const secondCall = spy.mock.calls[1][0] as string;

    expect(firstCall).toContain("\u001b[32m");
    expect(firstCall).toContain("[xTaskjs]");
    expect(firstCall).toContain("[MyService]");
    expect(firstCall).toContain("hello");
    expect(firstCall).toContain("+0ms");

    expect(secondCall).toContain("world");
    expect(secondCall).toContain("+5ms");
  });

  it("Should persist logs to a configurable .log file", () => {
    const baseDir = mkdtempSync(join(tmpdir(), "xtask-common-logger-"));
    const logsDir = join(baseDir, "logs");
    const filePath = join(logsDir, "my-service.log");

    const logger = new Logger({
      appName: "xTaskjs",
      context: "MyService",
      useColors: false,
      file: {
        enabled: true,
        path: filePath,
      },
    });

    vi.spyOn(Date, "now").mockReturnValue(1_713_516_000_000);
    vi.spyOn(console, "warn").mockImplementation();

    logger.warn("persist this");

    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, "utf-8");

    expect(content).toContain("[xTaskjs]");
    expect(content).toContain("[MyService]");
    expect(content).toContain("persist this");
    expect(content).toContain("+0ms");
    expect(content).not.toMatch(/\u001b\[[0-9;]*m/);

    rmSync(baseDir, { recursive: true, force: true });
  });
});