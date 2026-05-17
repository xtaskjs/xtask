import "reflect-metadata";
import assert from "assert";
import { Logger } from "@xtaskjs/common";
import { Module, Test } from "@xtaskjs/testing";
import { EmailService } from "./email.service";

const mockLogger = {
  info: (_: string) => {},
  warn: (_: string) => {},
  error: (_: string) => {},
};

const mockMailer = {
  sendTemplate: async (_template: string, _locals: any, _options: any) => ({
    messageId: "msg-001",
    accepted: [_options?.message?.to || "recipient@example.com"],
    message: "Preview: email content here",
  }),
};

@Module({
  providers: [
    EmailService,
    { provide: Logger, useValue: mockLogger },
    { provide: "xtask:mailer:service", useValue: mockMailer },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const emailService = moduleRef.get(EmailService);

  // Test: sendWelcomeEmail returns delivery info
  const welcome = await emailService.sendWelcomeEmail({
    to: "user@example.com",
    name: "Alice",
    product: "xTaskJS",
  });
  assert.strictEqual(welcome.template, "welcome-email");
  assert.strictEqual(welcome.delivery.messageId, "msg-001");
  assert.ok(typeof welcome.notification.messageId === "string");

  // Test: sendCampaignEmail returns delivery info
  const campaign = await emailService.sendCampaignEmail({
    to: "user@example.com",
    name: "Alice",
    campaign: "Spring Sale",
    ctaUrl: "https://example.com/spring",
  });
  assert.strictEqual(campaign.template, "campaign-email");
  assert.strictEqual(campaign.delivery.messageId, "msg-001");

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
