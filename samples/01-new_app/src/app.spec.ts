import "reflect-metadata";
import { describe, expect, test } from "vitest";
import { Logger } from "@xtaskjs/common";
import { Module, Test } from "@xtaskjs/testing";
import { HealthController } from "./health.controller";

const mockLogger = {
  info: (_: string) => {},
  warn: (_: string) => {},
  error: (_: string) => {},
};

@Module({
  providers: [
    HealthController,
    { provide: Logger, useValue: mockLogger },
  ],
})
class AppModule {}

describe("01-new_app", () => {
  test("health check returns expected shape", async () => {
    const moduleRef = await Test.createTestingModule(AppModule).compile();

    const health = moduleRef.get(HealthController);

    const result = health.check();
    expect(result.status).toBe("ok");
    expect(typeof result.timestamp).toBe("string");

    await moduleRef.close();
  });
});
