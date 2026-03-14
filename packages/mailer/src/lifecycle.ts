import { Container } from "@xtaskjs/core";
import nodemailer from "nodemailer";
import {
  clearRegisteredMailerTransports,
  getDefaultMailerTransportName,
  getRegisteredMailerTransports,
} from "./configuration";
import { MailerService } from "./mailer.service";
import { getMailerLifecycleToken, getMailerServiceToken, getMailerTransportToken } from "./tokens";
import {
  MailerSendOptions,
  MailerSendResult,
  MailerTransportFactory,
  MailerTransporter,
  RegisteredMailerTransportOptions,
} from "./types";

const isTransporter = (value: any): value is MailerTransporter => {
  return value && typeof value.sendMail === "function";
};

const isFactory = (value: any): value is MailerTransportFactory => {
  return typeof value === "function" && !isTransporter(value);
};

export class MailerLifecycleManager {
  private readonly transporters = new Map<string, MailerTransporter>();
  private readonly definitions = new Map<string, RegisteredMailerTransportOptions>();
  private container?: Container;

  async initialize(container?: Container): Promise<void> {
    this.definitions.clear();
    this.container = container;

    for (const definition of getRegisteredMailerTransports()) {
      this.definitions.set(definition.name, definition);
      if (this.transporters.has(definition.name)) {
        continue;
      }

      const transporter = await this.createTransporter(definition, container);
      this.transporters.set(definition.name, transporter);

      if (definition.verifyOnStart && typeof transporter.verify === "function") {
        await transporter.verify();
      }

      if (container && typeof (container as any).registerNamedInstance === "function") {
        (container as any).registerNamedInstance(getMailerTransportToken(definition.name), transporter);
      }
    }

    this.registerContainerBindings(container);
  }

  async destroy(): Promise<void> {
    for (const [name, transporter] of this.transporters.entries()) {
      const definition = this.definitions.get(name);
      if (definition?.closeOnShutdown === false) {
        continue;
      }

      if (typeof transporter.close === "function") {
        await Promise.resolve(transporter.close());
      }
      this.transporters.delete(name);
    }

    this.transporters.clear();
    this.definitions.clear();
    this.container = undefined;
  }

  getContainer(): Container | undefined {
    return this.container;
  }

  listTransportNames(): string[] {
    return Array.from(this.transporters.keys());
  }

  isInitialized(name = getDefaultMailerTransportName() || "default"): boolean {
    return this.transporters.has(name);
  }

  getTransporter(name = getDefaultMailerTransportName() || "default"): MailerTransporter {
    const transporter = this.transporters.get(name);
    if (!transporter) {
      throw new Error(`Mailer transport '${name}' is not initialized`);
    }
    return transporter;
  }

  async sendMail(
    options: MailerSendOptions,
    transportName = getDefaultMailerTransportName() || "default"
  ): Promise<MailerSendResult> {
    return this.getTransporter(transportName).sendMail(options);
  }

  async verify(transportName = getDefaultMailerTransportName() || "default"): Promise<boolean> {
    const transporter = this.getTransporter(transportName);
    if (typeof transporter.verify !== "function") {
      return true;
    }

    await transporter.verify();
    return true;
  }

  private async createTransporter(
    definition: RegisteredMailerTransportOptions,
    container?: Container
  ): Promise<MailerTransporter> {
    let resolvedTransport = definition.transport;

    if (isFactory(resolvedTransport)) {
      resolvedTransport = await resolvedTransport({
        name: definition.name,
        container,
      });
    }

    if (isTransporter(resolvedTransport)) {
      return resolvedTransport;
    }

    return nodemailer.createTransport(resolvedTransport as any, definition.defaults as any);
  }

  private registerContainerBindings(container?: Container): void {
    if (!container) {
      return;
    }

    const anyContainer = container as any;
    if (typeof anyContainer.registerNamedInstance === "function") {
      anyContainer.registerNamedInstance(getMailerLifecycleToken(), this);
    }

    if (typeof anyContainer.registerWithName === "function") {
      anyContainer.registerWithName(MailerService, { scope: "singleton" }, getMailerServiceToken());
    }
  }
}

const lifecycleManager = new MailerLifecycleManager();

export const initializeMailerIntegration = async (container?: Container): Promise<void> => {
  await lifecycleManager.initialize(container);
};

export const shutdownMailerIntegration = async (): Promise<void> => {
  await lifecycleManager.destroy();
};

export const getMailerLifecycleManager = (): MailerLifecycleManager => {
  return lifecycleManager;
};

export const resetMailerIntegration = async (): Promise<void> => {
  await shutdownMailerIntegration();
  clearRegisteredMailerTransports();
};