import "reflect-metadata";
import { Container } from "@xtaskjs/core";
import { z } from "zod";
import {
  ConfigModule,
  ConfigValidationError,
  configureConfig,
  getConfigLifecycleManager,
  getConfigService,
  getConfigServiceToken,
  initializeConfigIntegration,
  resetConfigIntegration,
} from "../src";

describe("@xtaskjs/config", () => {
  afterEach(async () => {
    await resetConfigIntegration();
  });

  test("validates and exposes typed values through ConfigService", async () => {
    configureConfig({
      schema: z.object({
        PORT: z.string().transform((value) => Number(value)),
        NODE_ENV: z.enum(["development", "test", "production"]),
      }),
      processEnv: {
        PORT: "3100",
        NODE_ENV: "test",
      },
      envFiles: [],
    });

    await initializeConfigIntegration();

    const service = getConfigService<{
      PORT: number;
      NODE_ENV: "development" | "test" | "production";
    }>();

    expect(service).toBeDefined();
    expect(service?.get("PORT")).toBe(3100);
    expect(service?.get("NODE_ENV")).toBe("test");
    expect(service?.has("PORT")).toBe(true);
    expect(service?.getOrDefault("PORT", 8080)).toBe(3100);
  });

  test("supports prefix filtering and env key stripping", async () => {
    ConfigModule.register({
      prefix: "DB",
      schema: z.object({
        HOST: z.string(),
        PORT: z.string().transform((value) => Number(value)),
      }),
      processEnv: {
        DB_HOST: "localhost",
        DB_PORT: "5432",
        IGNORE_ME: "x",
      },
      envFiles: [],
    });

    await initializeConfigIntegration();

    const service = getConfigService<{ HOST: string; PORT: number }>();
    expect(service?.getAll()).toEqual({ HOST: "localhost", PORT: 5432 });
  });

  test("fails fast with a ConfigValidationError when configuration is invalid", async () => {
    configureConfig({
      schema: z.object({
        PORT: z.string().transform((value) => Number(value)).refine((value) => value > 0),
      }),
      processEnv: {
        PORT: "0",
      },
      envFiles: [],
    });

    await expect(initializeConfigIntegration()).rejects.toBeInstanceOf(ConfigValidationError);
  });

  test("registers service and lifecycle instances into container bindings", async () => {
    configureConfig({
      schema: z.object({
        APP_NAME: z.string(),
      }),
      processEnv: {
        APP_NAME: "xtaskjs",
      },
      envFiles: [],
    });

    const container = new Container();
    await initializeConfigIntegration(container);

    const namedService = (container as { getByName: <T>(name: string) => T }).getByName(
      getConfigServiceToken()
    );

    expect(namedService).toBeDefined();
    expect(getConfigLifecycleManager().isInitialized()).toBe(true);
  });
});
