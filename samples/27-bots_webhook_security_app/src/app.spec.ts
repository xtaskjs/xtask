import "reflect-metadata";
import assert from "assert";
import { ApplicationLifeCycle, Container } from "@xtaskjs/core";
import { BotsModule, SlackAdapter, TelegramAdapter } from "@xtaskjs/bots";
import { WebhookGateway } from "./webhook.gateway";
import { WebhookController } from "./webhook.controller";
import { WebhookSignatureService } from "./webhook-signature.service";

async function main() {
  const container = new Container();
  const lifecycle = new ApplicationLifeCycle();

  const slackAdapter = new SlackAdapter();
  const telegramAdapter = new TelegramAdapter();

  container.register(WebhookGateway, { scope: "singleton" });
  container.register(WebhookSignatureService, { scope: "singleton" });
  container.register(WebhookController, { scope: "singleton" });

  await BotsModule.register({
    adapters: [slackAdapter, telegramAdapter],
  });
  await BotsModule.initialize(container, lifecycle);

  const signatures = container.get(WebhookSignatureService);
  const controller = container.get(WebhookController);

  const slackBody = {
    text: "deploy production",
    channel_id: "ops-room",
    user_id: "u-1",
  };
  const slackRawBody = JSON.stringify(slackBody);
  const slackTimestamp = String(Math.floor(Date.now() / 1000));
  const slackSignature = signatures.createSlackSignature(slackTimestamp, slackRawBody);

  const slackResponse = await controller.slack(
    {
      headers: {
        "x-slack-request-timestamp": slackTimestamp,
        "x-slack-signature": slackSignature,
      },
      rawBody: slackRawBody,
      body: slackBody,
    },
    slackBody
  );

  assert.strictEqual(slackResponse.ok, true);
  assert.strictEqual(slackResponse.platform, "slack");
  assert.strictEqual(slackResponse.handled, true);

  const telegramBody = {
    message: {
      text: "/start",
      chat: { id: 999 },
      from: { id: 123 },
    },
  };
  const telegramRawBody = JSON.stringify(telegramBody);
  const telegramSignature = signatures.createTelegramSignature(telegramRawBody);

  const telegramResponse = await controller.telegram(
    {
      headers: {
        "x-telegram-signature": telegramSignature,
      },
      rawBody: telegramRawBody,
      body: telegramBody,
    },
    telegramBody
  );

  assert.strictEqual(telegramResponse.ok, true);
  assert.strictEqual(telegramResponse.platform, "telegram");
  assert.strictEqual(telegramResponse.handled, true);

  let rejected = false;
  try {
    await controller.slack(
      {
        headers: {
          "x-slack-request-timestamp": slackTimestamp,
          "x-slack-signature": "v0=invalid",
        },
        rawBody: slackRawBody,
        body: slackBody,
      },
      slackBody
    );
  } catch (error: any) {
    rejected = true;
    assert.ok(String(error.message).includes("Invalid Slack webhook signature"));
  }

  assert.strictEqual(rejected, true);

  await BotsModule.shutdown();
  console.log("All tests passed!");
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
