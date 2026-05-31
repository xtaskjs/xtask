import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import {
  ConfigValidationError,
  configureConfig,
  getConfigLifecycleManager,
  getConfigService,
  initializeConfigIntegration,
  resetConfigIntegration,
} from "../src";

describe("@xtaskjs/config configuration", () => {
  afterEach(async () => {
    await resetConfigIntegration();
  });

  test("fails fast with a ConfigValidationError when configuration is invalid", () => {
    expect(() =>
      configureConfig({
        schema: z.object({
          PORT: z.string().transform((value) => Number(value)).refine((value) => value > 0),
        }),
        processEnv: {
          PORT: "0",
        },
        envFiles: [],
      })
    ).toThrow(ConfigValidationError);
  });

  test("loads .env files and keeps process.env precedence by default", async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "xtask-config-"));
    const envPath = path.join(projectRoot, ".env");

    try {
      fs.writeFileSync(envPath, "PORT=3000\nNODE_ENV=development\n", "utf8");

      configureConfig({
        schema: z.object({
          PORT: z.string().transform((value) => Number(value)),
          NODE_ENV: z.enum(["development", "test", "production"]),
        }),
        processEnv: {
          PORT: "3100",
          NODE_ENV: "test",
        },
        projectRoot,
      });

      await initializeConfigIntegration();

      const service = getConfigService<{
        PORT: number;
        NODE_ENV: "development" | "test" | "production";
      }>();

      expect(service?.getAll()).toEqual({ PORT: 3100, NODE_ENV: "test" });
      expect(getConfigLifecycleManager().getLoadedFiles()).toEqual([envPath]);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("respects env file precedence when processEnvFirst is false", async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "xtask-config-"));
    const envPath = path.join(projectRoot, ".env");

    try {
      fs.writeFileSync(envPath, "PORT=3000\nNODE_ENV=development\n", "utf8");

      configureConfig({
        schema: z.object({
          PORT: z.string().transform((value) => Number(value)),
          NODE_ENV: z.enum(["development", "test", "production"]),
        }),
        processEnv: {
          PORT: "3100",
          NODE_ENV: "test",
        },
        processEnvFirst: false,
        projectRoot,
      });

      await initializeConfigIntegration();

      const service = getConfigService<{
        PORT: number;
        NODE_ENV: "development" | "test" | "production";
      }>();

      expect(service?.getAll()).toEqual({ PORT: 3000, NODE_ENV: "development" });
      expect(getConfigLifecycleManager().getLoadedFiles()).toEqual([envPath]);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("formats ConfigValidationError issues with prefixed env keys", () => {
    try {
      configureConfig({
        prefix: "APP",
        schema: z.object({
          PORT: z.string().transform((value) => Number(value)).refine((value) => value > 0),
        }),
        processEnv: {
          APP_PORT: "0",
        },
        envFiles: [],
      });

      throw new Error("Expected configureConfig to throw ConfigValidationError");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError);
      const validationError = error as ConfigValidationError;
      expect(validationError.issues[0]?.key).toBe("PORT");
      expect(validationError.issues[0]?.envKey).toBe("APP_PORT");
      expect(validationError.message).toContain("APP_PORT");
    }
  });
});
