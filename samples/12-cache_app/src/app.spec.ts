import "reflect-metadata";
import assert from "assert";
import { Logger } from "@xtaskjs/common";
import { Module, Test } from "@xtaskjs/testing";
import { CacheDemoService, ProductCacheModel } from "./cache-demo.service";

const mockLogger = {
  info: (_: string) => {},
  warn: (_: string) => {},
  error: (_: string) => {},
};

const inMemoryStore = new Map<string, any>();

const mockCacheRepository = {
  getEntry: async (key: string) => inMemoryStore.get(key) ?? null,
  getSummary: () => ({ name: "products", driver: "memory", ttl: "45s", size: inMemoryStore.size }),
  getStore: () => ({ kind: "memory" }),
};

const mockCacheService = {
  isInitialized: (_model: any) => true,
  keys: async (_model: any) => Array.from(inMemoryStore.keys()),
};

@Module({
  providers: [
    CacheDemoService,
    { provide: Logger, useValue: mockLogger },
    { provide: "xtask:cache:repository:products", useValue: mockCacheRepository },
    { provide: "xtask:cache:service", useValue: mockCacheService },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const cacheService = moduleRef.get(CacheDemoService);

  // Test: initial state has zero source loads and reports cache as initialized
  const state = await cacheService.getState();
  assert.strictEqual(state.sourceLoads, 0);
  assert.strictEqual(state.initialized, true);
  assert.ok(Array.isArray(state.keys));

  // Test: inspectProduct delegates to the mocked repository
  const entry = await cacheService.inspectProduct("p-001");
  assert.strictEqual(entry, null, "Mocked repository returns null for missing entries");

  // Test: state reports model summary from mock
  const stateAfter = await cacheService.getState();
  assert.ok(typeof stateAfter.model === "object");

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
