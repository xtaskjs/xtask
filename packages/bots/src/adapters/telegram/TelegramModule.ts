import type { IBotAdapter } from "../../interfaces/IBotAdapter";
import { registerBotAdapter } from "../../lifecycle";
import { TelegrafAdapter } from "./TelegrafAdapter";

export class TelegramModule {
  static async register(adapter: IBotAdapter): Promise<void> {
    if (adapter.platform !== "telegram") {
      throw new Error("TelegramModule can only register adapters with platform 'telegram'");
    }

    await registerBotAdapter(adapter);
  }

  static async registerTelegraf(bot: any): Promise<TelegrafAdapter> {
    const adapter = new TelegrafAdapter(bot);
    await registerBotAdapter(adapter);
    return adapter;
  }
}
