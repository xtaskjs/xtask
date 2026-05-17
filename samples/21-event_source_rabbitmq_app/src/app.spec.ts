import "reflect-metadata";
import assert from "assert";
import { Logger } from "@xtaskjs/common";
import { Module, Test } from "@xtaskjs/testing";
import { EventSourceDemoService, RegisterUserRequest } from "./event-source.demo.service";
import { RabbitMqAuditService } from "./rabbitmq-audit.service";
import { UserAggregate } from "./user.aggregate";

const mockLogger = {
  info: (_: string) => {},
  warn: (_: string) => {},
  error: (_: string) => {},
};

const mockEventSourceRepository = {
  create: (id: string) => {
    const agg = new UserAggregate();
    return agg;
  },
  save: async (aggregate: any) => [
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
  load: async (id: string) => {
    throw new Error(`User ${id} not found`);
  },
};

const mockEventStore = {
  load: async (_stream: string, _id: string) => [],
};

const mockProjections = {
  find: async (_options?: any) => [],
  count: async () => 0,
};

const mockQueueService = {
  publish: async (_queue: string, _payload: any, _opts?: any) => {},
  isStarted: () => true,
  listGroups: () => [],
  listTransports: () => [],
  listConsumers: () => [],
};

@Module({
  providers: [
    EventSourceDemoService,
    RabbitMqAuditService,
    { provide: Logger, useValue: mockLogger },
    { provide: "xtask:event-source:repository:UserAggregate", useValue: mockEventSourceRepository },
    { provide: "xtask:event-source:store", useValue: mockEventStore },
    { provide: "xtask:typeorm:repository:event-source-db:UserProjectionEntity", useValue: mockProjections },
    { provide: "xtask:queues:service", useValue: mockQueueService },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const demoService = moduleRef.get(EventSourceDemoService);

  // Test: describe() returns static configuration info
  const info = demoService.describe();
  assert.strictEqual(info.sample, "21-event_source_rabbitmq_app");
  assert.ok(Array.isArray(info.endpoints));
  assert.ok(info.endpoints.length > 0);

  // Test: listUsers returns empty when no projections stored
  const users = await demoService.listUsers();
  assert.deepStrictEqual(users, []);

  // Test: registerUser creates an aggregate and saves events
  const request = Object.assign(new RegisterUserRequest(), {
    displayName: "Alice Smith",
    email: "alice@example.com",
  });
  const result = await demoService.registerUser(request);
  assert.strictEqual(result.accepted, true);
  assert.ok(Array.isArray(result.events));
  assert.ok(result.events.length > 0);
  assert.ok(typeof result.events[0].eventName === "string");

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
