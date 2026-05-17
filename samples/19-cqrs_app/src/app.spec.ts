import "reflect-metadata";
import assert from "assert";
import { Module, Test } from "@xtaskjs/testing";
import { CreateUserHandler } from "./cqrs.handlers";
import { CreateUserCommand } from "./messages";
import { UserWriteEntity } from "./user-write.entity";

let idSequence = 0;

const mockWriteRepository = {
  create: (data: Partial<UserWriteEntity>) =>
    ({ id: 0, displayName: data.displayName || "", email: data.email || "", createdAt: new Date() } as UserWriteEntity),
  save: async (entity: UserWriteEntity) => ({ ...entity, id: ++idSequence }),
};

const publishedEvents: any[] = [];

const mockEventBus = {
  publish: async (event: any) => {
    publishedEvents.push(event);
  },
};

@Module({
  providers: [
    CreateUserHandler,
    { provide: "xtask:cqrs:repository:write:UserWriteEntity", useValue: mockWriteRepository },
    { provide: "xtask:cqrs:event-bus", useValue: mockEventBus },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const handler = moduleRef.get(CreateUserHandler);

  // Test: execute creates a user and publishes an event
  const command = new CreateUserCommand("Alice Smith", "alice@example.com");
  const result = await handler.execute(command);

  assert.ok(result.id > 0);
  assert.strictEqual(result.displayName, "Alice Smith");
  assert.strictEqual(result.email, "alice@example.com");
  assert.strictEqual(result.status, "accepted");

  // Test: UserCreatedEvent was published
  assert.strictEqual(publishedEvents.length, 1);
  assert.strictEqual(publishedEvents[0].email, "alice@example.com");

  // Test: second user gets a different id
  const command2 = new CreateUserCommand("Bob Jones", "bob@example.com");
  const result2 = await handler.execute(command2);
  assert.ok(result2.id !== result.id);

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
