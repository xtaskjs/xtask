import "reflect-metadata";
import assert from "assert";
import { Logger } from "@xtaskjs/common";
import { Module, Test } from "@xtaskjs/testing";
import { WebController } from "./web.controller";

const mockLogger = {
  info: (_: string) => {},
  warn: (_: string) => {},
  error: (_: string) => {},
};

const mockHttpCache = {
  buildCacheControl: (options: any) =>
    `${options.visibility || "public"}, max-age=${options.maxAge || "0"}`,
  getCacheStatus: (_req: any) => ({ hit: false, key: "test" }),
};

@Module({
  providers: [
    WebController,
    { provide: Logger, useValue: mockLogger },
    { provide: "xtask:cache:http-service", useValue: mockHttpCache },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const controller = moduleRef.get(WebController);

  // Test: home() returns a view result with cache info
  const result = controller.home();
  assert.ok((result as any).__xtaskView === true, "Should return a view result");
  assert.strictEqual((result as any).template, "home");
  assert.ok((result as any).model.title.includes("Cache"));
  assert.ok(typeof (result as any).model.cacheHeader === "string");

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
