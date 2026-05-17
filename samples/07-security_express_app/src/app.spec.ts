import "reflect-metadata";
import assert from "assert";
import { Logger } from "@xtaskjs/common";
import { Module, Test } from "@xtaskjs/testing";
import { ProfileMailerService } from "./profile-mailer.service";
import { TokenService } from "./token.service";
import { UserDirectoryService } from "./user-directory.service";

const mockLogger = {
  info: (_: string) => {},
  warn: (_: string) => {},
  error: (_: string) => {},
};

const mockMailer = {
  sendTemplate: async (_template: string, _locals: any, _options: any) => ({
    messageId: "mock-message-id",
    accepted: ["recipient@example.com"],
    message: "Mock transport preview",
  }),
};

@Module({
  providers: [
    UserDirectoryService,
    TokenService,
    ProfileMailerService,
    { provide: Logger, useValue: mockLogger },
    { provide: "xtask:mailer:service", useValue: mockMailer },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const directory = moduleRef.get(UserDirectoryService);
  const tokens = moduleRef.get(TokenService);
  const mailer = moduleRef.get(ProfileMailerService);

  // Test: directory finds active users
  const viewer = directory.findActiveUser("viewer");
  assert.ok(viewer !== undefined);
  assert.ok(viewer!.roles.includes("user"));

  // Test: JWT issued for viewer has 3 parts
  const jwt = tokens.issueJwt(viewer!);
  assert.ok(jwt.split(".").length === 3);

  // Test: profile mailer sends and returns delivery info
  const delivery = await mailer.sendProfileSummary({ sub: "viewer", roles: ["user"] });
  assert.ok(delivery.transactional.messageId === "mock-message-id");
  assert.ok(delivery.notifications.messageId === "mock-message-id");

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
