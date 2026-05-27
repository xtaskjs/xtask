import type { ApplicationLifeCycle, Container } from "@xtaskjs/core";
import { resetValidationConfiguration } from "./configuration";
import { ValidationService } from "./service";
import { getValidationLifecycleToken, getValidationServiceToken } from "./tokens";

let globalLifecycle: ValidationLifecycleManager | undefined;

export class ValidationLifecycleManager {
  private service?: ValidationService;
  private initialized = false;

  initialize(container?: Container, lifecycle?: ApplicationLifeCycle): void {
    this.service = new ValidationService();
    this.initialized = true;

    const anyContainer = container as
      | { registerNamedInstance?: <T>(name: string, instance: T) => void }
      | undefined;
    if (anyContainer?.registerNamedInstance) {
      anyContainer.registerNamedInstance(getValidationLifecycleToken(), this);
      anyContainer.registerNamedInstance(getValidationServiceToken(), this.service);
    }

    if (lifecycle && typeof (lifecycle as { on?: Function }).on === "function") {
      lifecycle.on("stopping", () => {
        this.destroy();
      });
    }
  }

  destroy(): void {
    this.service = undefined;
    this.initialized = false;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getService(): ValidationService | undefined {
    return this.service;
  }
}

export const initializeValidationIntegration = (
  container: Container,
  lifecycle?: ApplicationLifeCycle
): Promise<void> => {
  if (!globalLifecycle) {
    globalLifecycle = new ValidationLifecycleManager();
  }

  globalLifecycle.initialize(container, lifecycle);
  return Promise.resolve();
};

export const shutdownValidationIntegration = (): Promise<void> => {
  if (globalLifecycle) {
    globalLifecycle.destroy();
  }

  return Promise.resolve();
};

export const resetValidationIntegration = (): void => {
  globalLifecycle = undefined;
  resetValidationConfiguration();
};

export const getValidationLifecycleManager = (): ValidationLifecycleManager | undefined => {
  return globalLifecycle;
};