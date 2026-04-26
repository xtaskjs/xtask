import { ApplicationLifeCycle, Container } from "@xtaskjs/core";
import {
  getThrottlerConfiguration,
  resetThrottlerConfiguration,
} from "./configuration";
import { MemoryThrottleStore, RedisThrottleStore } from "./stores";
import { ThrottlerService } from "./throttler.service";
import { getThrottlerLifecycleToken, getThrottlerServiceToken } from "./tokens";
import { ThrottleStore } from "./types";

let globalLifecycle: ThrottlerLifecycleManager | undefined;

export class ThrottlerLifecycleManager {
  private store?: ThrottleStore;
  private service?: ThrottlerService;
  private container?: Container;
  private lifecycle?: ApplicationLifeCycle;
  private initialized = false;
  private stoppingRegistered = false;

  async initialize(container?: Container, lifecycle?: ApplicationLifeCycle): Promise<void> {
    await this.destroy();
    this.container = container;
    this.lifecycle = lifecycle;

    const config = getThrottlerConfiguration();

    if (config.driver === "redis") {
      this.store = new RedisThrottleStore(config.redis);
      if (config.redis?.connectOnStart !== false && typeof this.store.connect === "function") {
        await this.store.connect();
      }
    } else {
      this.store = new MemoryThrottleStore();
    }

    this.service = new ThrottlerService(this.store);
    this.initialized = true;

    this.registerContainerBindings(container);

    if (!this.stoppingRegistered && lifecycle && typeof (lifecycle as any).on === "function") {
      lifecycle.on("stopping", async () => {
        await this.destroy();
      });
      this.stoppingRegistered = true;
    }
  }

  async destroy(): Promise<void> {
    if (this.store && typeof this.store.disconnect === "function") {
      await this.store.disconnect();
    }

    this.store = undefined;
    this.service = undefined;
    this.container = undefined;
    this.lifecycle = undefined;
    this.initialized = false;
    this.stoppingRegistered = false;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getService(): ThrottlerService | undefined {
    return this.service;
  }

  getStore(): ThrottleStore | undefined {
    return this.store;
  }

  private registerContainerBindings(container?: Container): void {
    if (!container) {
      return;
    }

    const anyContainer = container as any;
    if (typeof anyContainer.registerNamedInstance === "function") {
      anyContainer.registerNamedInstance(getThrottlerLifecycleToken(), this);
      if (this.service) {
        anyContainer.registerNamedInstance(getThrottlerServiceToken(), this.service);
      }
    }
  }
}

export const initializeThrottlerIntegration = async (
  container: Container,
  lifecycle?: ApplicationLifeCycle
): Promise<void> => {
  if (!globalLifecycle) {
    globalLifecycle = new ThrottlerLifecycleManager();
  }

  await globalLifecycle.initialize(container, lifecycle);

  if (container) {
    const anyContainer = container as any;
    if (typeof anyContainer.registerNamedInstance === "function") {
      anyContainer.registerNamedInstance("xtask:throttler:global-lifecycle", globalLifecycle);
    }
  }

  if (lifecycle && typeof (lifecycle as any).on === "function") {
    (lifecycle as any).on("ready", () => {
      injectThrottlerIntoRouteState(lifecycle, globalLifecycle!);
    });
  }
};

const injectThrottlerIntoRouteState = (
  lifecycle: ApplicationLifeCycle,
  lifecycleManager: ThrottlerLifecycleManager
): void => {
  if (typeof (lifecycle as any).use === "function") {
    (lifecycle as any).use(async (context: any, next: () => Promise<any>) => {
      context.state._throttlerLifecycle = lifecycleManager;
      return next();
    });
  }
};

export const shutdownThrottlerIntegration = async (): Promise<void> => {
  if (globalLifecycle) {
    await globalLifecycle.destroy();
  }
};

export const resetThrottlerIntegration = (): void => {
  globalLifecycle = undefined;
  resetThrottlerConfiguration();
};

export const getThrottlerLifecycleManager = (): ThrottlerLifecycleManager | undefined => {
  return globalLifecycle;
};
