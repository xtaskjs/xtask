import { appendFileSync, existsSync, mkdirSync } from "fs";
import { dirname, extname, join } from "path";

type LoggerLevel = "info" | "warn" | "error";

export interface LoggerFileOptions {
  enabled?: boolean;
  path?: string;
}

export interface LoggerOptions {
  appName?: string;
  context?: string;
  useColors?: boolean;
  file?: LoggerFileOptions;
}

const ANSI_RESET = "\x1b[0m";
const LEVEL_COLORS: Record<LoggerLevel, string> = {
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};
const ANSI_COLOR_MATCHER = /\x1b\[[0-9;]*m/g;

export class Logger {
  private readonly appName: string;
  private readonly useColors: boolean;
  private readonly filePath?: string;
  private context?: string;
  private lastTimestamp?: number;

  constructor(options: LoggerOptions = {}) {
    this.appName = options.appName || "xTaskjs";
    this.context = options.context;
    this.useColors = options.useColors !== false;
    this.filePath = this.resolveFilePath(options.file);
  }

  setContext(context: string): void {
    this.context = context;
  }

  info(message: string): void {
    this.write("info", message);
  }

  warn(message: string): void {
    this.write("warn", message);
  }

  error(message: string): void {
    this.write("error", message);
  }

  private resolveFilePath(fileOptions?: LoggerFileOptions): string | undefined {
    if (!fileOptions?.enabled) {
      return undefined;
    }

    const configuredPath = fileOptions.path?.trim();
    if (!configuredPath) {
      return join(process.cwd(), "logs", `${this.appName.toLowerCase()}.log`);
    }

    if (extname(configuredPath).toLowerCase() === ".log") {
      return configuredPath;
    }

    return join(configuredPath, `${this.appName.toLowerCase()}.log`);
  }

  private write(level: LoggerLevel, message: string): void {
    const now = Date.now();
    const delta = this.lastTimestamp === undefined ? 0 : now - this.lastTimestamp;
    this.lastTimestamp = now;

    const timestamp = new Date(now).toLocaleString("en-US");
    const contextChunk = this.context ? `   [${this.context}]` : "";
    const line = `[${this.appName}] ${process.pid}   - ${timestamp}${contextChunk} ${message} +${delta}ms`;

    this.writeToConsole(level, line);
    this.writeToFile(line);
  }

  private writeToConsole(level: LoggerLevel, line: string): void {
    const output = this.useColors ? `${LEVEL_COLORS[level]}${line}${ANSI_RESET}` : line;

    if (level === "warn") {
      console.warn(output);
      return;
    }

    if (level === "error") {
      console.error(output);
      return;
    }

    console.log(output);
  }

  private writeToFile(line: string): void {
    if (!this.filePath) {
      return;
    }

    try {
      const folder = dirname(this.filePath);
      if (!existsSync(folder)) {
        mkdirSync(folder, { recursive: true });
      }
      appendFileSync(this.filePath, `${line.replace(ANSI_COLOR_MATCHER, "")}\n`, {
        encoding: "utf-8",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[${this.appName}] Logger file persistence failed: ${message}\n`);
    }
  }
}