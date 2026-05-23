import type { ApplicationLifeCycle, Container } from "@xtaskjs/core";
import type { IBotAdapter } from "../interfaces/IBotAdapter";
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

  static async initialize(container?: Container, lifecycle?: ApplicationLifeCycle): Promise<void> {
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
