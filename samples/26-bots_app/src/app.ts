import "reflect-metadata";
import { ApplicationLifeCycle, Container, Service } from "@xtaskjs/core";
import {
import { ConfigModule } from "@xtaskjs/config";
import { z } from "zod";
const SampleConfigSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  XTASK_DI_STRATEGY: z.enum(["lazy", "eager"]).default("lazy"),
  XTASK_DI_METRICS: z.enum(["true", "false"]).default("true"),
  XTASK_HOT_DEBOUNCE_MS: z.coerce.number().int().nonnegative().default(60),
});

ConfigModule.register({
  schema: SampleConfigSchema,
  envFiles: [".env", ".env.local"],
});

  BotGateway,
  BotsModule,
  BotsService,
  OnCallbackQuery,
  OnCommand,
  OnMessage,
  SlackAdapter,
  TelegramAdapter,
  WhatsappAdapter,
  getBotsServiceToken,
} from "@xtaskjs/bots";

@Service()
@BotGateway(["telegram", "slack", "whatsapp"], { group: ["support", "demo"] })
class SupportBotGateway {
  @OnCommand("/start")
  async onStart(context: any) {
    await context.reply(`Welcome ${context.platform}`);
  }

  @OnMessage(/hola|hello/i)
  async onGreeting(context: any) {
    await context.reply(`Greeting received on ${context.platform}`);
  }

  @OnCallbackQuery(/^menu:/)
  async onMenu(context: any) {
    await context.reply(`Callback ${context.callbackData}`);
  }
}

async function main() {
  const container = new Container();
  const lifecycle = new ApplicationLifeCycle();

  const telegramAdapter = new TelegramAdapter({
    sender: async (message) => {
      console.log("[telegram] outbound", message);
    },
  });

  const slackAdapter = new SlackAdapter({
    sender: async (message) => {
      console.log("[slack] outbound", message);
    },
  });

  const whatsappAdapter = new WhatsappAdapter({
    sender: async (message) => {
      console.log("[whatsapp] outbound", message);
    },
  });

  container.register(SupportBotGateway, { scope: "singleton" });

  await BotsModule.register({
    adapters: [telegramAdapter, slackAdapter, whatsappAdapter],
  });
  await BotsModule.initialize(container, lifecycle);

  const botsService = container.getByName<BotsService>(getBotsServiceToken());
  console.log("Adapters:", botsService.listAdapters());
  console.log("Gateways:", botsService.listGateways());

  await telegramAdapter.receive({
    chatId: "tg-chat",
    text: "/start",
    reply: async (text) => console.log("[telegram] reply", text),
  });

  await slackAdapter.receive({
    chatId: "sl-chat",
    text: "hola equipo",
    reply: async (text) => console.log("[slack] reply", text),
  });

  await whatsappAdapter.receive({
    chatId: "wa-chat",
    callbackData: "menu:main",
    reply: async (text) => console.log("[whatsapp] reply", text),
  });

  await botsService.send({
    platform: "telegram",
    chatId: "tg-chat",
    text: "Broadcast demo from BotsService",
  });

  await BotsModule.shutdown();
}

main().catch((error) => {
  console.error("Error running bots sample:", error);
  process.exit(1);
});
