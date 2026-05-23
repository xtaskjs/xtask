import "reflect-metadata";
import assert from "assert";
import { ApplicationLifeCycle, Container, Service } from "@xtaskjs/core";
import {
  BotGateway,
  BotsModule,
  BotsService,
  OnCommand,
  OnMessage,
  SlackAdapter,
  TelegramAdapter,
  getBotsServiceToken,
} from "@xtaskjs/bots";

@Service()
@BotGateway("telegram")
class TelegramSpecGateway {
  public readonly events: string[] = [];

  @OnCommand("/start")
  async onStart(context: any) {
    this.events.push(`start:${context.chatId}`);
    await context.reply("started");
  }

  @OnMessage(/ping/i)
  async onPing(context: any) {
    this.events.push(`ping:${context.chatId}`);
    await context.reply("pong");
  }
}

@Service()
@BotGateway("slack")
class SlackSpecGateway {
  public readonly events: string[] = [];

  @OnMessage("deploy")
  async onDeploy(context: any) {
    this.events.push(`deploy:${context.chatId}`);
  }
}

async function main() {
  const replies: string[] = [];
  const outbound: string[] = [];

  const container = new Container();
  const lifecycle = new ApplicationLifeCycle();
  const telegramAdapter = new TelegramAdapter({
    sender: async (message) => {
      outbound.push(message.text);
    },
  });
  const slackAdapter = new SlackAdapter();

  container.register(TelegramSpecGateway, { scope: "singleton" });
  container.register(SlackSpecGateway, { scope: "singleton" });

  await BotsModule.register({
    adapters: [telegramAdapter, slackAdapter],
  });
  await BotsModule.initialize(container, lifecycle);

  await telegramAdapter.receive({
    chatId: "tg-1",
    text: "/start",
    reply: async (text) => {
      replies.push(text);
    },
  });

  await telegramAdapter.receive({
    chatId: "tg-1",
    text: "ping",
    reply: async (text) => {
      replies.push(text);
    },
  });

  await slackAdapter.receive({
    chatId: "sl-1",
    text: "deploy now",
    reply: async () => undefined,
  });

  const botsService = container.getByName<BotsService>(getBotsServiceToken());
  await botsService.send({
    platform: "telegram",
    chatId: "tg-1",
    text: "outbound",
  });

  assert.deepStrictEqual(replies, ["started", "pong"]);
  assert.deepStrictEqual(outbound, ["outbound"]);

  const telegramGateway = container.get(TelegramSpecGateway);
  const slackGateway = container.get(SlackSpecGateway);
  assert.deepStrictEqual(telegramGateway.events, ["start:tg-1", "ping:tg-1"]);
  assert.deepStrictEqual(slackGateway.events, ["deploy:sl-1"]);

  await BotsModule.shutdown();
  console.log("All tests passed!");
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
