import "reflect-metadata";
import assert from "assert";
import { Logger } from "@xtaskjs/common";
import { Module, Test } from "@xtaskjs/testing";
import { ThrottlerDemoService } from "./throttler-demo.service";

const mockLogger = {
  info: (_: string) => {},
  warn: (_: string) => {},
  error: (_: string) => {},
};

const resetHistory: string[] = [];

const mockThrottler = {
  reset: async (ip: string) => {
    resetHistory.push(ip);
  },
};

@Module({
  providers: [
    ThrottlerDemoService,
    { provide: Logger, useValue: mockLogger },
    { provide: "xtask:throttler:service", useValue: mockThrottler },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const throttlerService = moduleRef.get(ThrottlerDemoService);

  // Test: initial total request count is 0
  assert.strictEqual(throttlerService.getTotalRequests(), 0);

  // Test: recordRequest increments counter
  const r1 = throttlerService.recordRequest("search");
  assert.strictEqual(r1.label, "search");
  assert.strictEqual(r1.totalRequests, 1);

  // Test: multiple requests accumulate
  throttlerService.recordRequest("list");
  throttlerService.recordRequest("detail");
  assert.strictEqual(throttlerService.getTotalRequests(), 3);

  // Test: resetLimitForIp delegates to throttler service
  await throttlerService.resetLimitForIp("192.168.1.1");
  assert.ok(resetHistory.includes("192.168.1.1"));

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
