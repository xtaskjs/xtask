import "reflect-metadata";
import assert from "assert";
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

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const health = moduleRef.get(HealthController);

  // Test: health check returns expected shape with adapter info
  const result = health.check();
  assert.strictEqual(result.status, "ok");
  assert.strictEqual(result.adapter, "express");
  assert.ok(typeof result.timestamp === "string");

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
