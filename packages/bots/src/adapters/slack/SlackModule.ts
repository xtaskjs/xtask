import type { IBotAdapter } from "../../interfaces/IBotAdapter";
import { registerBotAdapter } from "../../lifecycle";
import { SlackBoltAdapter } from "./SlackBoltAdapter";

export class SlackModule {
  static async register(adapter: IBotAdapter): Promise<void> {
    if (adapter.platform !== "slack") {
      throw new Error("SlackModule can only register adapters with platform 'slack'");
    }

    await registerBotAdapter(adapter);
  }

  static async registerBolt(app: any): Promise<SlackBoltAdapter> {
    const adapter = new SlackBoltAdapter(app);
    await registerBotAdapter(adapter);
    return adapter;
  }
}
