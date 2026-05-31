import type { ApplicationLifeCycle, Container } from "@xtaskjs/core";
import {
  getConfiguredConfigService,
  getConfiguredLoadedFiles,
  getRequiredConfigConfiguration,
  resetConfigConfiguration,
} from "./configuration";
import { ConfigService } from "./service";
import { getConfigLifecycleToken, getConfigServiceToken } from "./tokens";

export class ConfigLifecycleManager {
  private service?: ConfigService<any>;
  private initialized = false;
  private loadedFiles: string[] = [];

  async initialize(container?: Container, lifecycle?: ApplicationLifeCycle): Promise<void> {
    await this.destroy();

    getRequiredConfigConfiguration();
    const configuredService = getConfiguredConfigService();
    if (!configuredService) {
      throw new Error(
        "Config service is not prepared. Call configureConfig(...) or ConfigModule.register(...) before initializeConfigIntegration()."
      );
    }

    this.service = configuredService as ConfigService<any>;
    this.initialized = true;
    this.loadedFiles = getConfiguredLoadedFiles();

    this.registerContainerBindings(container);

    if (lifecycle && typeof (lifecycle as { on?: Function }).on === "function") {
      lifecycle.on("stopping", async () => {
        await this.destroy();
      });
    }
  }

  async destroy(): Promise<void> {
    this.service = undefined;
    this.initialized = false;
    this.loadedFiles = [];
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getService<TConfig extends Record<string, unknown> = Record<string, unknown>>():
    | ConfigService<TConfig>
    | undefined {
    return this.service as ConfigService<TConfig> | undefined;
  }

  getLoadedFiles(): string[] {
    return [...this.loadedFiles];
  }

  private registerContainerBindings(container?: Container): void {
    if (!container || !this.service) {
      return;
    }

    const anyContainer = container as any;

    if (typeof anyContainer.registerNamedInstance === "function") {
      anyContainer.registerNamedInstance(getConfigLifecycleToken(), this);
      anyContainer.registerNamedInstance(getConfigServiceToken(), this.service);
    }

    if (anyContainer.providers instanceof Map) {
      anyContainer.providers.set(ConfigLifecycleManager, () => this);
      anyContainer.providers.set(ConfigService, () => this.service);
    }

    if (anyContainer.singletons instanceof Map) {
      anyContainer.singletons.set(ConfigLifecycleManager, this);
      anyContainer.singletons.set(ConfigService, this.service);
    }
  }
}

const lifecycleManager = new ConfigLifecycleManager();

export const initializeConfigIntegration = async (
  container?: Container,
  lifecycle?: ApplicationLifeCycle
): Promise<void> => {
  await lifecycleManager.initialize(container, lifecycle);
};

export const shutdownConfigIntegration = async (): Promise<void> => {
  await lifecycleManager.destroy();
};

export const getConfigLifecycleManager = (): ConfigLifecycleManager => {
  return lifecycleManager;
};

export const getConfigService = <TConfig extends Record<string, unknown> = Record<string, unknown>>():
  | ConfigService<TConfig>
  | undefined => {
  return lifecycleManager.getService<TConfig>();
};

export const resetConfigIntegration = async (): Promise<void> => {
  await shutdownConfigIntegration();
  resetConfigConfiguration();
};
