import { Service } from "@xtaskjs/core";
import { BotGateway, OnCommand, OnMessage } from "@xtaskjs/bots";

@Service()
@BotGateway(["telegram", "slack"], { group: ["webhooks", "security"] })
export class WebhookGateway {
  public readonly events: string[] = [];

  @OnCommand("/start")
  async onStart(context: any) {
    this.events.push(`start:${context.platform}:${context.chatId}`);
    await context.reply("Webhook authenticated and command processed");
  }

  @OnMessage(/deploy|release|status/i)
  async onOpsMessage(context: any) {
    this.events.push(`ops:${context.platform}:${context.chatId}`);
    await context.reply(`Message processed for ${context.platform}`);
  }
}
