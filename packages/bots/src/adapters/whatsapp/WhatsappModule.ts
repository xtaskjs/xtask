import type { IBotAdapter } from "../../interfaces/IBotAdapter";
import { registerBotAdapter } from "../../lifecycle";
import { BaileysAdapter } from "./BaileysAdapter";

export class WhatsappModule {
  static async register(adapter: IBotAdapter): Promise<void> {
    if (adapter.platform !== "whatsapp") {
      throw new Error("WhatsappModule can only register adapters with platform 'whatsapp'");
    }

    await registerBotAdapter(adapter);
  }

  static async registerBaileys(socket: any): Promise<BaileysAdapter> {
    const adapter = new BaileysAdapter(socket);
    await registerBotAdapter(adapter);
    return adapter;
  }
}
