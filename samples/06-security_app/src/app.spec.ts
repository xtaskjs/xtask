import "reflect-metadata";
import assert from "assert";
import { Logger } from "@xtaskjs/common";
import { Module, Test } from "@xtaskjs/testing";
import { TokenService } from "./token.service";
import { UserDirectoryService } from "./user-directory.service";

const mockLogger = {
  info: (_: string) => {},
  warn: (_: string) => {},
  error: (_: string) => {},
};

@Module({
  providers: [
    UserDirectoryService,
    TokenService,
    { provide: Logger, useValue: mockLogger },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const directory = moduleRef.get(UserDirectoryService);
  const tokens = moduleRef.get(TokenService);

  // Test: directory lists known users
  const users = directory.listUsers();
  assert.ok(users.length >= 2);

  // Test: find known active user
  const admin = directory.findActiveUser("admin");
  assert.ok(admin !== undefined);
  assert.strictEqual(admin!.id, "admin");
  assert.ok(admin!.roles.includes("admin"));
  assert.ok(admin!.active);

  // Test: find unknown user returns undefined
  const missing = directory.findActiveUser("ghost");
  assert.strictEqual(missing, undefined);

  // Test: issue JWT for existing user
  const jwt = tokens.issueJwt(admin!);
  assert.ok(typeof jwt === "string");
  assert.ok(jwt.split(".").length === 3, "JWT should have 3 parts");

  // Test: issue JWE for existing user
  const jwe = tokens.issueJwe(admin!);
  assert.ok(typeof jwe === "string");
  assert.ok(jwe.split(".").length === 5, "JWE compact serialization should have 5 parts");

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
