import "reflect-metadata";
import assert from "assert";
import { Logger } from "@xtaskjs/common";
import { Module, Test } from "@xtaskjs/testing";
import { SchedulerDemoService } from "./scheduler-demo.service";

const mockLogger = {
  info: (_: string) => {},
  warn: (_: string) => {},
  error: (_: string) => {},
};

const scheduledJobs: Array<{ name: string; kind: string }> = [];

const mockScheduler = {
  listGroups: () => ["startup", "monitoring", "maintenance"],
  listJobs: () => scheduledJobs,
  runGroup: async (_group: string) => {},
};

@Module({
  providers: [
    SchedulerDemoService,
    { provide: Logger, useValue: mockLogger },
    { provide: "xtask:scheduler:service", useValue: mockScheduler },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const scheduler = moduleRef.get(SchedulerDemoService);

  // Test: snapshot includes counters and groups
  const snapshot = scheduler.getSnapshot();
  assert.ok(Array.isArray(snapshot.groups));
  assert.ok(typeof snapshot.counters.heartbeatCount === "number");
  assert.ok(typeof snapshot.counters.warmupCount === "number");

  // Test: groups list returns expected groups from mock
  const groups = scheduler.getGroups();
  assert.ok(groups.includes("monitoring"));
  assert.ok(groups.includes("maintenance"));

  // Test: runMaintenanceNow delegates to scheduler
  const afterRun = await scheduler.runMaintenanceNow();
  assert.ok(typeof afterRun.counters === "object");

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
