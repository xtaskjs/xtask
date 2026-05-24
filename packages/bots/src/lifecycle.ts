import { getBotsConfiguration, resetBotsConfiguration } from "./configuration";
import { getBotGatewayMetadata, getBotHandlerMetadata, normalizeCommand, stringifyPattern } from "./metadata";
import { getBotAdapterToken, getBotsLifecycleToken, getBotsServiceToken } from "./tokens";
import type {
  BotAdapterSummary,
  BotContainerLike,
  BotGatewaySummary,
  BotHandlerKind,
  BotLifecycleLike,
  DispatchedBotMessage,
} from "./types";
import type { BotSendInput } from "./types";
import type { IBotAdapter } from "./interfaces/IBotAdapter";
import type { IBotContext } from "./interfaces/IBotContext";
import { BotsService } from "./bots.service";

interface DiscoveredHandler {
  name: string;
  kind: BotHandlerKind;
  methodName: string;
  command?: string;
  pattern?: string | RegExp;
  disabled: boolean;
}

interface DiscoveredGateway {
  name: string;
  targetName: string;
  platforms: string[];
  groups: string[];
  disabled: boolean;
  instance: any;
  handlers: DiscoveredHandler[];
}

const extractCommand = (text?: string): string | undefined => {
  const value = String(text || "").trim();
  if (!value.startsWith("/")) {
    return undefined;
  }

  const command = value.split(/\s+/)[0];
  const [name] = command.split("@");
  return name;
};

const matchesPattern = (value: string | undefined, pattern?: string | RegExp): boolean => {
  if (!pattern) {
    return true;
  }

  const input = String(value || "");
  if (typeof pattern === "string") {
    return input.toLowerCase().includes(pattern.toLowerCase());
  }

  return pattern.test(input);
};

const normalizeAdapterPlatform = (platform: string): string => {
  const normalized = String(platform || "").trim().toLowerCase();
  if (!normalized) {
    throw new Error("Bot adapter platform requires a non-empty value");
  }
  return normalized;
};

export class BotsLifecycleManager {
  private readonly gateways = new Map<string, DiscoveredGateway>();
  private readonly adapters = new Map<string, IBotAdapter>();
  private readonly adapterStatus = new Map<string, boolean>();
  private container?: BotContainerLike;
  private lifecycle?: BotLifecycleLike;
  private started = false;

  async initialize(container?: BotContainerLike, lifecycle?: BotLifecycleLike): Promise<void> {
    await this.stopAll();
    this.gateways.clear();
    this.container = container;
    this.lifecycle = lifecycle;

    this.registerContainerBindings(container);
    this.discoverGateways(container);
    await this.initializeAdapters();

    if (lifecycle && typeof (lifecycle as any).on === "function") {
      lifecycle.on("ready", async () => {
        if (getBotsConfiguration().autoStart) {
          await this.startAll();
        }
      });

      lifecycle.on("stopping", async () => {
        await this.stopAll();
      });
    }
  }

  async destroy(): Promise<void> {
    await this.stopAll();
    this.gateways.clear();
    this.container = undefined;
    this.lifecycle = undefined;
    this.started = false;
  }

  async registerAdapter(adapter: IBotAdapter): Promise<void> {
    const platform = normalizeAdapterPlatform(adapter.platform);
    this.adapters.set(platform, adapter);
    this.adapterStatus.set(platform, false);

    this.registerAdapterInContainer(adapter);

    if (adapter.setMessageHandler) {
      adapter.setMessageHandler(async (context) => {
        await this.dispatch(context);
      });
    }

    if (adapter.initialize) {
      await Promise.resolve(
        adapter.initialize({
          container: this.container,
          lifecycle: this.lifecycle,
        })
      );
    }

    if (this.started && adapter.start) {
      await Promise.resolve(adapter.start());
      this.adapterStatus.set(platform, true);
    }
  }

  listGateways(): BotGatewaySummary[] {
    return Array.from(this.gateways.values())
      .map((gateway) => ({
        name: gateway.name,
        targetName: gateway.targetName,
        platforms: [...gateway.platforms],
        groups: [...gateway.groups],
        disabled: gateway.disabled,
        handlers: gateway.handlers.map((handler) => ({
          name: handler.name,
          kind: handler.kind,
          methodName: handler.methodName,
          command: handler.command,
          pattern: stringifyPattern(handler.pattern),
          disabled: handler.disabled,
        })),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  listAdapters(): BotAdapterSummary[] {
    return Array.from(this.adapters.values())
      .map((adapter) => {
        const platform = normalizeAdapterPlatform(adapter.platform);
        return {
          name: adapter.name,
          platform,
          started: this.adapterStatus.get(platform) === true,
        };
      })
      .sort((left, right) => left.platform.localeCompare(right.platform));
  }

  async startAll(): Promise<void> {
    for (const [platform, adapter] of this.adapters.entries()) {
      if (adapter.start) {
        await Promise.resolve(adapter.start());
      }
      this.adapterStatus.set(platform, true);
    }

    this.started = true;
  }

  async stopAll(): Promise<void> {
    for (const [platform, adapter] of this.adapters.entries()) {
      if (adapter.stop) {
        await Promise.resolve(adapter.stop());
      }
      this.adapterStatus.set(platform, false);
    }

    this.started = false;
  }

  async send(input: BotSendInput): Promise<any> {
    const platform = normalizeAdapterPlatform(input.platform);
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`No bot adapter registered for platform '${platform}'`);
    }

    if (!adapter.sendMessage) {
      throw new Error(`Bot adapter '${adapter.name}' does not support sendMessage`);
    }

    return Promise.resolve(
      adapter.sendMessage({
        chatId: input.chatId,
        text: input.text,
        options: input.options,
      })
    );
  }

  async dispatch(context: IBotContext): Promise<DispatchedBotMessage> {
    const platform = normalizeAdapterPlatform(context.platform);
    const handlers: string[] = [];

    for (const gateway of this.gateways.values()) {
      if (gateway.disabled || !gateway.platforms.includes(platform)) {
        continue;
      }

      for (const handler of gateway.handlers) {
        if (handler.disabled || !this.matchesHandler(context, handler)) {
          continue;
        }

        handlers.push(handler.name);
        await Promise.resolve(gateway.instance[handler.methodName]?.call(gateway.instance, context));
      }
    }

    if (!handlers.length && getBotsConfiguration().throwOnUnhandled) {
      throw new Error(`Unhandled bot message for platform '${platform}'`);
    }

    return {
      context,
      handled: handlers.length > 0,
      handlers,
    };
  }

  private matchesHandler(context: IBotContext, handler: DiscoveredHandler): boolean {
    if (handler.kind === "message") {
      return matchesPattern(context.text, handler.pattern);
    }

    if (handler.kind === "command") {
      const rawCommand = context.command || extractCommand(context.text);
      if (!rawCommand) {
        return false;
      }

      const incoming = normalizeCommand(rawCommand);
      return incoming === handler.command;
    }

    return matchesPattern(context.callbackData, handler.pattern);
  }

  private discoverGateways(container?: BotContainerLike): void {
    if (!container || typeof (container as any).getRegisteredTypes !== "function") {
      return;
    }

    const configuration = getBotsConfiguration();
    const registeredTypes = (container as any).getRegisteredTypes() as any[];

    for (const type of registeredTypes) {
      const gatewayMetadata = getBotGatewayMetadata(type);
      if (!gatewayMetadata) {
        continue;
      }

      const instance = container.get(type);
      const handlers = getBotHandlerMetadata(type);
      const gatewayName = gatewayMetadata.name || type.name || "AnonymousGateway";

      if (this.gateways.has(gatewayName) && configuration.failOnDuplicateGatewayNames) {
        throw new Error(`Duplicate bot gateway name '${gatewayName}' detected`);
      }

      const discoveredHandlers: DiscoveredHandler[] = handlers.map((handlerMetadata) => {
        const methodName = String(handlerMetadata.method);
        return {
          name: handlerMetadata.name || `${gatewayName}.${methodName}`,
          kind: handlerMetadata.kind,
          methodName,
          command: handlerMetadata.command,
          pattern: handlerMetadata.pattern,
          disabled: handlerMetadata.disabled === true,
        };
      });

      this.gateways.set(gatewayName, {
        name: gatewayName,
        targetName: type.name || "Anonymous",
        platforms: [...gatewayMetadata.platforms],
        groups: [...gatewayMetadata.groups],
        disabled: gatewayMetadata.disabled,
        handlers: discoveredHandlers,
        instance,
      });
    }
  }

  private registerContainerBindings(container?: BotContainerLike): void {
    if (!container) {
      return;
    }

    const anyContainer = container as any;
    if (typeof anyContainer.registerNamedInstance === "function") {
      anyContainer.registerNamedInstance(getBotsLifecycleToken(), this);
    }

    if (typeof anyContainer.registerWithName === "function") {
      anyContainer.registerWithName(BotsService, { scope: "singleton" }, getBotsServiceToken());
    }

    for (const adapter of this.adapters.values()) {
      this.registerAdapterInContainer(adapter);
    }
  }

  private registerAdapterInContainer(adapter: IBotAdapter): void {
    const anyContainer = this.container as any;
    if (!anyContainer || typeof anyContainer.registerNamedInstance !== "function") {
      return;
    }

    anyContainer.registerNamedInstance(getBotAdapterToken(adapter.platform), adapter);
  }

  private async initializeAdapters(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      if (adapter.setMessageHandler) {
        adapter.setMessageHandler(async (context) => {
          await this.dispatch(context);
        });
      }

      if (adapter.initialize) {
        await Promise.resolve(
          adapter.initialize({
            container: this.container,
            lifecycle: this.lifecycle,
          })
        );
      }
    }
  }
}

const lifecycleManager = new BotsLifecycleManager();

export const initializeBotsIntegration = async (
  container?: BotContainerLike,
  lifecycle?: BotLifecycleLike
): Promise<void> => {
  await lifecycleManager.initialize(container, lifecycle);
};

export const shutdownBotsIntegration = async (): Promise<void> => {
  await lifecycleManager.destroy();
};

export const getBotsLifecycleManager = (): BotsLifecycleManager => {
  return lifecycleManager;
};

export const registerBotAdapter = async (adapter: IBotAdapter): Promise<void> => {
  await lifecycleManager.registerAdapter(adapter);
};

export const resetBotsIntegration = async (): Promise<void> => {
  await shutdownBotsIntegration();
  resetBotsConfiguration();
};
