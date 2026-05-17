import "reflect-metadata";
import assert from "assert";
import { Logger } from "@xtaskjs/common";
import { Module, Test } from "@xtaskjs/testing";
import { UserEntity } from "./user.entity";
import { UsersService } from "./users.service";

const mockLogger = {
  info: (_: string) => {},
  warn: (_: string) => {},
  error: (_: string) => {},
};

const storedUsers: UserEntity[] = [];

const mockRepository = {
  find: async (_options?: any) => [...storedUsers].sort((a, b) => a.id - b.id),
  create: (data: Partial<UserEntity>) => ({ id: 0, name: data.name || "" } as UserEntity),
  save: async (entity: UserEntity) => {
    const saved = { ...entity, id: storedUsers.length + 1 };
    storedUsers.push(saved);
    return saved;
  },
};

@Module({
  providers: [
    UsersService,
    { provide: Logger, useValue: mockLogger },
    { provide: "xtask:typeorm:repository:default:UserEntity", useValue: mockRepository },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const usersService = moduleRef.get(UsersService);

  // Test: list returns empty initially
  const empty = await usersService.listUsers();
  assert.deepStrictEqual(empty, []);

  // Test: createUser stores and returns user
  const created = await usersService.createUser("alice");
  assert.strictEqual(created.name, "alice");
  assert.ok(created.id > 0);

  // Test: list returns the created user
  const list = await usersService.listUsers();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].name, "alice");

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
