import "reflect-metadata";
import assert from "assert";
import { Module, Test } from "@xtaskjs/testing";
import { EventSourceDemoService, RegisterUserRequest } from "./event-source.demo.service";
import { UserAggregate } from "./user.aggregate";

const mockEventSourceRepository = {
  create: (_id: string) => new UserAggregate(),
  save: async (_aggregate: any) => [
    {
      id: "evt-001",
      stream: "users",
      streamId: "user-abc",
      eventName: "UserRegisteredEvent",
      version: 1,
      occurredAt: new Date(),
      metadata: {},
      payload: {},
    },
  ],
  load: async (_id: string) => {
    const agg = new UserAggregate();
    return agg;
  },
};

const mockEventStore = {
  load: async (_stream: string, _id: string) => [],
};

@Module({
  providers: [
    EventSourceDemoService,
    { provide: "xtask:event-source:repository:UserAggregate", useValue: mockEventSourceRepository },
    { provide: "xtask:event-source:store", useValue: mockEventStore },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const demoService = moduleRef.get(EventSourceDemoService);

  // Test: registerUser creates an aggregate and returns events
  const request = Object.assign(new RegisterUserRequest(), {
    displayName: "Alice Smith",
    email: "alice@example.com",
  });
  const result = await demoService.registerUser(request);
  assert.strictEqual(result.accepted, true);
  assert.ok(Array.isArray(result.events));
  assert.ok(result.events.length > 0);
  assert.strictEqual(result.events[0].eventName, "UserRegisteredEvent");

  // Test: inspectStream returns aggregate and stream events
  const inspection = await demoService.inspectStream("user-abc");
  assert.ok(typeof inspection.aggregate === "object");
  assert.ok(Array.isArray(inspection.stream));

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
