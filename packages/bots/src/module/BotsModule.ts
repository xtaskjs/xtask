import type { IBotAdapter } from "../interfaces/IBotAdapter";
import type { BotContainerLike, BotLifecycleLike } from "../types";
import {
  getBotsLifecycleManager,
  initializeBotsIntegration,
  registerBotAdapter,
  shutdownBotsIntegration,
} from "../lifecycle";
import { BotsService } from "../bots.service";

export interface BotsModuleOptions {
  adapters?: IBotAdapter[];
}

export class BotsModule {
  static async register(options: BotsModuleOptions = {}): Promise<void> {
    for (const adapter of options.adapters || []) {
      await registerBotAdapter(adapter);
    }
  }

  static async initialize(container?: BotContainerLike, lifecycle?: BotLifecycleLike): Promise<void> {
    await initializeBotsIntegration(container, lifecycle);
  }

  static async shutdown(): Promise<void> {
    await shutdownBotsIntegration();
  }

  static service(): BotsService {
    return new BotsService();
  }

  static manager() {
    return getBotsLifecycleManager();
  }
}
