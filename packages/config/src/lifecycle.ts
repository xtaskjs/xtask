import type { ApplicationLifeCycle, Container } from "@xtaskjs/core";
import { getRequiredConfigConfiguration, resetConfigConfiguration } from "./configuration";
import { loadEnvironment } from "./env.loader";
import { ConfigValidationError } from "./errors";
import { ConfigService } from "./service";
import { getConfigLifecycleToken, getConfigServiceToken } from "./tokens";

export class ConfigLifecycleManager {
  private service?: ConfigService<any>;
  private initialized = false;
  private loadedFiles: string[] = [];

  async initialize(container?: Container, lifecycle?: ApplicationLifeCycle): Promise<void> {
    await this.destroy();

    const configuration = getRequiredConfigConfiguration();
    const loadedEnvironment = loadEnvironment(configuration);
    const parsed = configuration.schema.safeParse(loadedEnvironment.values);

    if (!parsed.success) {
      throw new ConfigValidationError({
        issues: parsed.error.issues,
        keyMap: loadedEnvironment.keyMap,
      });
    }

    this.service = new ConfigService(parsed.data as Record<string, unknown>);
    this.initialized = true;
    this.loadedFiles = loadedEnvironment.loadedFiles;

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
