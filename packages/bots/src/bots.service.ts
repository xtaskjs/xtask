import type { IBotAdapter } from "./interfaces/IBotAdapter";
import type { IBotContext } from "./interfaces/IBotContext";
import type { BotAdapterSummary, BotGatewaySummary, BotSendInput, DispatchedBotMessage } from "./types";
import { getBotsLifecycleManager } from "./lifecycle";

export class BotsService {
  async registerAdapter(adapter: IBotAdapter): Promise<void> {
    await getBotsLifecycleManager().registerAdapter(adapter);
  }

  listGateways(): BotGatewaySummary[] {
    return getBotsLifecycleManager().listGateways();
  }

  listAdapters(): BotAdapterSummary[] {
    return getBotsLifecycleManager().listAdapters();
  }

  async startAll(): Promise<void> {
    await getBotsLifecycleManager().startAll();
  }

  async stopAll(): Promise<void> {
    await getBotsLifecycleManager().stopAll();
  }

  async dispatch(context: IBotContext): Promise<DispatchedBotMessage> {
    return getBotsLifecycleManager().dispatch(context);
  }

  async send(input: BotSendInput): Promise<any> {
    return getBotsLifecycleManager().send(input);
  }
}
