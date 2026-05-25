import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { ApplicationLifeCycle, Container, Service } from "@xtaskjs/core";
import {
  BotGateway,
  BotsLifecycleManager,
  BotsModule,
  BotsService,
  InjectBotAdapter,
  InjectBotsLifecycleManager,
  InjectBotsService,
  OnCallbackQuery,
  OnCommand,
  OnMessage,
  SlackAdapter,
  TelegramAdapter,
  WhatsappAdapter,
  TelegramModule,
  SlackModule,
  WhatsappModule,
  getBotsLifecycleManager,
  initializeBotsIntegration,
  resetBotsIntegration,
} from "../src";

@Service()
@BotGateway("telegram", { group: "support" })
class TelegramGateway {
  public readonly events: string[] = [];

  constructor(
    @InjectBotsService()
    public readonly botsService: BotsService,
    @InjectBotsLifecycleManager()
    public readonly lifecycleManager: BotsLifecycleManager,
    @InjectBotAdapter("telegram")
    public readonly telegramAdapter: any
  ) {}

  @OnCommand("/start")
  async onStart(context: any) {
    this.events.push(`start:${context.chatId}`);
    await context.reply("started");
  }

  @OnMessage(/hola/i)
  async onHola(context: any) {
    this.events.push(`hola:${context.chatId}`);
    await context.reply("hola recibido");
  }

  @OnCallbackQuery(/^menu:/)
  async onCallback(context: any) {
    this.events.push(`callback:${context.callbackData}`);
    await context.reply("menu recibido");
  }
}

@Service()
@BotGateway("slack")
class SlackGateway {
  public readonly events: string[] = [];

  @OnMessage("deploy")
  async onDeploy(context: any) {
    this.events.push(`deploy:${context.chatId}`);
  }
}

describe("bots integration", () => {
  beforeEach(async () => {
    await resetBotsIntegration();
  });

  afterEach(async () => {
    await resetBotsIntegration();
  });

  test("discovers gateways, wires DI tokens, and dispatches message/command/callback handlers", async () => {
    const replies: string[] = [];
    const outbound: Array<{ chatId: string; text: string }> = [];

    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();
    const telegramAdapter = new TelegramAdapter({
      sender: async (message) => {
        outbound.push({ chatId: message.chatId, text: message.text });
      },
    });
    const slackAdapter = new SlackAdapter();
    const whatsappAdapter = new WhatsappAdapter();

    container.register(TelegramGateway, { scope: "singleton" });
    container.register(SlackGateway, { scope: "singleton" });

    await BotsModule.register({
      adapters: [telegramAdapter, slackAdapter, whatsappAdapter],
    });
    await initializeBotsIntegration(container, lifecycle);

    const telegramGateway = container.get(TelegramGateway);
    const slackGateway = container.get(SlackGateway);

    expect(telegramGateway.botsService).toBeInstanceOf(BotsService);
    expect(telegramGateway.lifecycleManager).toBeInstanceOf(BotsLifecycleManager);
    expect(telegramGateway.telegramAdapter).toBe(telegramAdapter);

    await telegramAdapter.receive({
      chatId: "tg-1",
      text: "/start",
      reply: async (text) => {
        replies.push(text);
      },
    });

    await telegramAdapter.receive({
      chatId: "tg-1",
      text: "hola equipo",
      reply: async (text) => {
        replies.push(text);
      },
    });

    await telegramAdapter.receive({
      chatId: "tg-1",
      callbackData: "menu:main",
      reply: async (text) => {
        replies.push(text);
      },
    });

    await slackAdapter.receive({
      chatId: "sl-1",
      text: "deploy now",
      reply: async () => undefined,
    });

    expect(telegramGateway.events).toEqual([
      "start:tg-1",
      "hola:tg-1",
      "callback:menu:main",
    ]);
    expect(slackGateway.events).toEqual(["deploy:sl-1"]);
    expect(replies).toEqual(["started", "hola recibido", "menu recibido"]);

    await telegramGateway.botsService.send({
      platform: "telegram",
      chatId: "tg-1",
      text: "mensaje saliente",
    });

    expect(outbound).toEqual([{ chatId: "tg-1", text: "mensaje saliente" }]);

    const adapters = telegramGateway.botsService.listAdapters().map((entry) => entry.platform);
    expect(adapters).toEqual(["slack", "telegram", "whatsapp"]);

    const gateways = telegramGateway.botsService.listGateways().map((entry) => entry.name).sort();
    expect(gateways).toEqual(["SlackGateway", "TelegramGateway"]);
  });

  test("supports convenience registration helpers for telegraf, slack bolt, and baileys", async () => {
    const telegrafHandlers = new Map<string, (payload: any) => Promise<void> | void>();
    const telegrafLike = {
      on: (event: string, handler: (payload: any) => Promise<void> | void) => {
        telegrafHandlers.set(event, handler);
      },
      launch: async () => undefined,
      stop: async () => undefined,
      telegram: {
        sendMessage: async () => undefined,
      },
    };

    const slackHandlers = new Map<string, (payload: any) => Promise<void> | void>();
    const slackLike = {
      event: (event: string, handler: (payload: any) => Promise<void> | void) => {
        slackHandlers.set(event, handler);
      },
      start: async () => undefined,
      stop: async () => undefined,
      client: {
        chat: {
          postMessage: async () => undefined,
        },
      },
    };

    const baileysHandlers = new Map<string, (payload: any) => Promise<void> | void>();
    const baileysLike = {
      ev: {
        on: (event: string, handler: (payload: any) => Promise<void> | void) => {
          baileysHandlers.set(event, handler);
        },
      },
      sendMessage: async () => undefined,
      end: () => undefined,
    };

    await TelegramModule.registerTelegraf(telegrafLike);
    await SlackModule.registerBolt(slackLike);
    await WhatsappModule.registerBaileys(baileysLike);

    const platforms = getBotsLifecycleManager().listAdapters().map((entry) => entry.platform).sort();
    expect(platforms).toEqual(["slack", "telegram", "whatsapp"]);

    expect(telegrafHandlers.has("message")).toBe(true);
    expect(slackHandlers.has("message")).toBe(true);
    expect(baileysHandlers.has("messages.upsert")).toBe(true);
  });
});
