import { ApplicationLifeCycle, Container } from "@xtaskjs/core";
import {
  clearRegisteredQueueTransports,
  getQueueConfiguration,
  getRegisteredQueueTransports,
  registerInMemoryQueueTransport,
  resetQueueConfiguration,
} from "./configuration";
import { getQueueHandlerMetadata, parseQueueDuration } from "./metadata";
import { QueueService } from "./queue.service";
import { getQueueLifecycleToken, getQueueServiceToken, getQueueTransportToken } from "./tokens";
import {
  QueueConsumerSummary,
  QueueConsumerPolicy,
  QueueHandlerContext,
  QueueHandlerMetadata,
  QueueMatchPattern,
  QueueProducer,
  QueueProducerDefaults,
  QueuePublishOptions,
  QueueRetryStrategy,
  QueueSubscriptionHandle,
  QueueSubscriptionMessage,
  QueueTransport,
  QueueTransportFactory,
  QueueTransportSummary,
  RegisteredQueueTransportOptions,
} from "./types";

interface DiscoveredConsumer {
  name: string;
  queue?: string;
  pattern?: QueueMatchPattern;
  patternSummary?: string;
  transportName: string;
  disabled: boolean;
  autoStart: boolean;
  concurrency: number;
  consumerPolicy: QueueConsumerPolicy;
  consumerGroup?: string;
  requeueOnError: boolean;
  stopOnError: boolean;
  maxRetries: number;
  retryDelayMs: number;
  retryStrategy: QueueRetryStrategy;
  deadLetterQueue?: string;
  deadLetterTransportName?: string;
  targetName: string;
  methodName: string;
  groups: string[];
  instance: any;
  invoke: (payload: any, context: QueueHandlerContext<any>) => Promise<any>;
}

const RETRY_ATTEMPT_HEADER = "x-xtask-retry-attempt";
const RETRY_CONSUMER_HEADER = "x-xtask-retry-consumer";
const RETRY_ERROR_HEADER = "x-xtask-last-error";
const DEAD_LETTER_REASON_HEADER = "x-xtask-dead-letter-reason";
const DEAD_LETTER_SOURCE_HEADER = "x-xtask-dead-letter-source";

const normalizeOptionalName = (value?: string): string | undefined => {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
};

const getRetryAttempt = (message: QueueSubscriptionMessage<any>): number => {
  const rawAttempt = message.headers?.[RETRY_ATTEMPT_HEADER];
  const parsedValue = Number(rawAttempt);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
};

const getRetryDelayForAttempt = (
  baseDelayMs: number,
  attempt: number,
  strategy: QueueRetryStrategy
): number => {
  if (baseDelayMs <= 0) {
    return 0;
  }

  if (strategy === "exponential") {
    const multiplier = Math.max(0, attempt - 1);
    return baseDelayMs * Math.pow(2, multiplier);
  }

  return baseDelayMs;
};

const isFactory = (value: any): value is QueueTransportFactory => {
  return typeof value === "function" && typeof value.publish !== "function";
};

const normalizeGroups = (value?: string | string[]): string[] => {
  if (!value) {
    return [];
  }

  const groups = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      groups
        .map((group) => group.trim())
        .filter((group) => group.length > 0)
    )
  );
};

const normalizeConsumerName = (
  targetName: string,
  methodName: string,
  metadata: QueueHandlerMetadata
): string => {
  const configuredName = metadata.options.name;
  return configuredName && configuredName.trim().length > 0
    ? configuredName.trim()
    : `${targetName}.${methodName}`;
};

const patternToSummary = (pattern?: QueueMatchPattern): string | undefined => {
  if (!pattern) {
    return undefined;
  }

  if (typeof pattern === "function") {
    return "[function pattern]";
  }

  return pattern.toString();
};

export class QueueLifecycleManager {
  private readonly transports = new Map<string, QueueTransport>();
  private readonly transportDefinitions = new Map<string, RegisteredQueueTransportOptions>();
  private readonly consumers = new Map<string, DiscoveredConsumer>();
  private readonly activeConsumers = new Map<string, QueueSubscriptionHandle>();
  private container?: Container;
  private lifecycle?: ApplicationLifeCycle;
  private started = false;

  async initialize(container?: Container, lifecycle?: ApplicationLifeCycle): Promise<void> {
    await this.destroy();
    this.container = container;
    this.lifecycle = lifecycle;

    await this.initializeTransports(container, lifecycle);
    this.registerContainerBindings(container);
    this.discoverConsumers(container);

    if (lifecycle && typeof (lifecycle as any).on === "function") {
      lifecycle.on("ready", async () => {
        if (getQueueConfiguration().autoStart) {
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

    for (const [name, transport] of this.transports.entries()) {
      const definition = this.transportDefinitions.get(name);
      if (definition?.disconnectOnShutdown === false) {
        continue;
      }

      if (typeof transport.disconnect === "function") {
        await Promise.resolve(transport.disconnect());
      }
    }

    this.transports.clear();
    this.transportDefinitions.clear();
    this.consumers.clear();
    this.container = undefined;
    this.lifecycle = undefined;
    this.started = false;
  }

  getContainer(): Container | undefined {
    return this.container;
  }

  isStarted(): boolean {
    return this.started;
  }

  listTransportNames(): string[] {
    return Array.from(this.transports.keys()).sort();
  }

  listTransports(): QueueTransportSummary[] {
    return this.listTransportNames().map((name) => {
      const transport = this.getTransport(name);
      const definition = this.transportDefinitions.get(name);
      return {
        name,
        kind: definition?.kind || "custom",
        connected: typeof transport.isConnected === "function" ? transport.isConnected() : true,
      };
    });
  }

  getTransport(name = getQueueConfiguration().defaultTransportName): QueueTransport {
    const transport = this.transports.get(name);
    if (!transport) {
      throw new Error(`Queue transport '${name}' is not initialized`);
    }

    return transport;
  }

  listConsumers(group?: string): QueueConsumerSummary[] {
    const normalizedGroup = group?.trim();
    return Array.from(this.consumers.values())
      .filter((consumer) => !normalizedGroup || consumer.groups.includes(normalizedGroup))
      .map((consumer) => ({
        name: consumer.name,
        queue: consumer.queue,
        pattern: consumer.patternSummary,
        transportName: consumer.transportName,
        disabled: consumer.disabled,
        autoStart: consumer.autoStart,
        started: this.activeConsumers.has(consumer.name),
        targetName: consumer.targetName,
        methodName: consumer.methodName,
        groups: [...consumer.groups],
        concurrency: consumer.concurrency,
        consumerPolicy: consumer.consumerPolicy,
        consumerGroup: consumer.consumerGroup,
        requeueOnError: consumer.requeueOnError,
        stopOnError: consumer.stopOnError,
        maxRetries: consumer.maxRetries,
        retryDelayMs: consumer.retryDelayMs,
        retryStrategy: consumer.retryStrategy,
        deadLetterQueue: consumer.deadLetterQueue,
        deadLetterTransportName: consumer.deadLetterTransportName,
      }));
  }

  listGroups(): string[] {
    return Array.from(
      new Set(Array.from(this.consumers.values()).flatMap((consumer) => consumer.groups))
    ).sort();
  }

  async startAll(): Promise<void> {
    for (const consumer of this.consumers.values()) {
      if (!consumer.disabled && consumer.autoStart) {
        await this.startConsumer(consumer.name);
      }
    }

    this.syncStartedState();
  }

  async stopAll(): Promise<void> {
    for (const consumerName of Array.from(this.activeConsumers.keys())) {
      await this.stopConsumer(consumerName);
    }

    this.syncStartedState();
  }

  async startGroup(group: string): Promise<void> {
    for (const consumer of this.getConsumersByGroup(group)) {
      if (!consumer.disabled) {
        await this.startConsumer(consumer.name);
      }
    }

    this.syncStartedState();
  }

  async stopGroup(group: string): Promise<void> {
    for (const consumer of this.getConsumersByGroup(group)) {
      await this.stopConsumer(consumer.name);
    }

    this.syncStartedState();
  }

  async startConsumer(name: string): Promise<void> {
    const consumer = this.getConsumerOrThrow(name);
    if (consumer.disabled || this.activeConsumers.has(name)) {
      return;
    }

    const transport = this.getTransport(consumer.transportName);
    const handle = await transport.subscribe({
      consumerName: consumer.name,
      queue: consumer.queue,
      pattern: consumer.pattern,
      concurrency: consumer.concurrency,
      consumerPolicy: consumer.consumerPolicy,
      consumerGroup: consumer.consumerGroup,
      handler: async (message) => {
        await this.handleMessage(consumer, message);
      },
    });

    this.activeConsumers.set(name, handle || {});
    this.syncStartedState();
  }

  async stopConsumer(name: string): Promise<void> {
    const handle = this.activeConsumers.get(name);
    if (!handle) {
      return;
    }

    if (typeof handle.stop === "function") {
      await Promise.resolve(handle.stop());
    }

    this.activeConsumers.delete(name);
    this.syncStartedState();
  }

  async publish<T = any>(
    queue: string,
    payload: T,
    options: QueuePublishOptions = {}
  ): Promise<any> {
    const normalizedQueue = queue?.trim();
    if (!normalizedQueue) {
      throw new Error("Queue publish requires a non-empty queue name");
    }

    const transportName = options.transportName || getQueueConfiguration().defaultTransportName;
    const transport = this.getTransport(transportName);

    return transport.publish(normalizedQueue, {
      queue: normalizedQueue,
      transportName,
      payload,
      headers: { ...(options.headers || {}) },
      key: options.key,
      correlationId: options.correlationId,
      replyTo: options.replyTo,
      metadata: options.metadata ? { ...options.metadata } : undefined,
      persistent: options.persistent,
      raw: options.raw,
      timestamp: new Date(),
      delayMs: options.delay !== undefined ? parseQueueDuration(options.delay) : 0,
    });
  }

  createProducer(defaults: QueueProducerDefaults = {}): QueueProducer {
    return {
      publish: async (payload, options = {}) => {
        const queue = options.queue || defaults.queue;
        if (!queue) {
          throw new Error("Queue producer requires a default queue or options.queue");
        }

        return this.publish(queue, payload, {
          ...defaults,
          ...options,
          headers: {
            ...(defaults.headers || {}),
            ...(options.headers || {}),
          },
          metadata: {
            ...(defaults.metadata || {}),
            ...(options.metadata || {}),
          },
        });
      },
    };
  }

  private async initializeTransports(
    container?: Container,
    lifecycle?: ApplicationLifeCycle
  ): Promise<void> {
    let definitions = getRegisteredQueueTransports();
    if (definitions.length === 0 && getQueueConfiguration().autoCreateDefaultInMemoryTransport) {
      registerInMemoryQueueTransport({
        name: getQueueConfiguration().defaultTransportName,
      });
      definitions = getRegisteredQueueTransports();
    }

    for (const definition of definitions) {
      const name = definition.name || getQueueConfiguration().defaultTransportName;
      const transport = await this.createTransport(definition, container, lifecycle);

      this.transportDefinitions.set(name, definition);
      this.transports.set(name, transport);

      if (definition.connectOnInitialize !== false && typeof transport.connect === "function") {
        await Promise.resolve(transport.connect());
      }

      if (container && typeof (container as any).registerNamedInstance === "function") {
        (container as any).registerNamedInstance(getQueueTransportToken(name), transport);
      }
    }
  }

  private async createTransport(
    definition: RegisteredQueueTransportOptions,
    container?: Container,
    lifecycle?: ApplicationLifeCycle
  ): Promise<QueueTransport> {
    const resolvedTransport = isFactory(definition.transport)
      ? await definition.transport({
          name: definition.name || getQueueConfiguration().defaultTransportName,
          container,
          lifecycle,
        })
      : definition.transport;

    return resolvedTransport;
  }

  private discoverConsumers(container?: Container): void {
    if (!container || typeof (container as any).getRegisteredTypes !== "function") {
      return;
    }

    const registeredTypes = (container as any).getRegisteredTypes() as any[];
    for (const type of registeredTypes) {
      const metadata = getQueueHandlerMetadata(type);
      if (metadata.length === 0) {
        continue;
      }

      const instance = container.get(type);
      for (const handlerMetadata of metadata) {
        this.registerConsumer(type, instance, handlerMetadata);
      }
    }
  }

  private registerConsumer(type: any, instance: any, metadata: QueueHandlerMetadata): void {
    const targetName = type.name || instance?.constructor?.name || "AnonymousConsumer";
    const methodName = String(metadata.method);
    const method = instance?.[metadata.method];
    if (typeof method !== "function") {
      throw new Error(`Queue handler '${targetName}.${methodName}' is not a function`);
    }

    const name = normalizeConsumerName(targetName, methodName, metadata);
    if (this.consumers.has(name) && getQueueConfiguration().failOnDuplicateHandlerNames) {
      throw new Error(`Queue consumer '${name}' is already registered`);
    }

    const queue = metadata.options.queue?.trim();
    if (!queue && !metadata.options.pattern) {
      throw new Error(`Queue handler '${name}' requires a queue or pattern`);
    }

    this.consumers.set(name, {
      name,
      queue,
      pattern: metadata.options.pattern,
      patternSummary: patternToSummary(metadata.options.pattern),
      transportName:
        metadata.options.transportName || getQueueConfiguration().defaultTransportName,
      disabled: metadata.options.disabled === true,
      autoStart: metadata.options.autoStart !== false,
      concurrency: Math.max(1, metadata.options.concurrency || 1),
      consumerPolicy: metadata.options.consumerPolicy || "broadcast",
      consumerGroup: normalizeOptionalName(metadata.options.consumerGroup),
      requeueOnError: metadata.options.requeueOnError === true,
      stopOnError: metadata.options.stopOnError === true,
      maxRetries: Math.max(0, metadata.options.maxRetries || 0),
      retryDelayMs:
        metadata.options.retryDelay !== undefined ? parseQueueDuration(metadata.options.retryDelay) : 0,
      retryStrategy: metadata.options.retryStrategy || "fixed",
      deadLetterQueue: normalizeOptionalName(metadata.options.deadLetterQueue),
      deadLetterTransportName: normalizeOptionalName(metadata.options.deadLetterTransportName),
      targetName,
      methodName,
      groups: normalizeGroups(metadata.options.group),
      instance,
      invoke: async (payload, context) => method.call(instance, payload, context),
    });
  }

  private async handleMessage(
    consumer: DiscoveredConsumer,
    message: QueueSubscriptionMessage<any>
  ): Promise<void> {
    const attempt = getRetryAttempt(message);
    let settled = false;
    const ack = async () => {
      if (settled) {
        return;
      }

      settled = true;
      await Promise.resolve(message.ack?.());
    };

    const nack = async (requeue = false) => {
      if (settled) {
        return;
      }

      settled = true;
      if (typeof message.nack === "function") {
        await Promise.resolve(message.nack({ requeue }));
        return;
      }

      if (requeue) {
        await this.publish(message.queue, message.payload, {
          transportName: message.transportName,
          headers: { ...(message.headers || {}) },
          key: message.key,
          correlationId: message.correlationId,
          replyTo: message.replyTo,
          metadata: message.metadata ? { ...message.metadata } : undefined,
          persistent: message.persistent,
          raw: message.raw,
        });
      }
    };

    const context: QueueHandlerContext<any> = {
      name: consumer.name,
      queue: message.queue,
      transportName: message.transportName,
      targetName: consumer.targetName,
      methodName: consumer.methodName,
      groups: [...consumer.groups],
      attempt,
      maxRetries: consumer.maxRetries,
      deadLetterQueue: consumer.deadLetterQueue,
      message,
      ack,
      nack,
      publish: async (queue, payload, options) =>
        this.publish(queue, payload, {
          transportName: message.transportName,
          ...options,
        }),
    };

    try {
      await consumer.invoke(message.payload, context);
      await ack();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const canRetry = attempt < consumer.maxRetries;

      if (canRetry) {
        const nextAttempt = attempt + 1;
        await this.publish(message.queue, message.payload, {
          transportName: message.transportName,
          headers: {
            ...(message.headers || {}),
            [RETRY_ATTEMPT_HEADER]: nextAttempt,
            [RETRY_CONSUMER_HEADER]: consumer.name,
            [RETRY_ERROR_HEADER]: errorMessage,
          },
          key: message.key,
          correlationId: message.correlationId,
          replyTo: message.replyTo,
          metadata: {
            ...(message.metadata || {}),
            retry: {
              attempt: nextAttempt,
              maxRetries: consumer.maxRetries,
              strategy: consumer.retryStrategy,
            },
          },
          persistent: message.persistent,
          raw: message.raw,
          delay: getRetryDelayForAttempt(
            consumer.retryDelayMs,
            nextAttempt,
            consumer.retryStrategy
          ),
        });
        await ack();
      } else if (consumer.deadLetterQueue) {
        await this.publish(consumer.deadLetterQueue, message.payload, {
          transportName: consumer.deadLetterTransportName || message.transportName,
          headers: {
            ...(message.headers || {}),
            [RETRY_ATTEMPT_HEADER]: attempt,
            [RETRY_CONSUMER_HEADER]: consumer.name,
            [RETRY_ERROR_HEADER]: errorMessage,
            [DEAD_LETTER_REASON_HEADER]: "handler-error",
            [DEAD_LETTER_SOURCE_HEADER]: message.queue,
          },
          key: message.key,
          correlationId: message.correlationId,
          replyTo: message.replyTo,
          metadata: {
            ...(message.metadata || {}),
            deadLetter: {
              sourceQueue: message.queue,
              consumerName: consumer.name,
              error: errorMessage,
              attempts: attempt,
            },
          },
          persistent: message.persistent,
          raw: message.raw,
        });
        await ack();
      } else {
        await nack(consumer.requeueOnError);
      }

      if (consumer.stopOnError) {
        await this.stopConsumer(consumer.name);
      }

      if (getQueueConfiguration().rethrowUnhandledErrors) {
        throw error;
      }
    }
  }

  private getConsumersByGroup(group: string): DiscoveredConsumer[] {
    const normalizedGroup = group.trim();
    return Array.from(this.consumers.values()).filter((consumer) =>
      consumer.groups.includes(normalizedGroup)
    );
  }

  private getConsumerOrThrow(name: string): DiscoveredConsumer {
    const consumer = this.consumers.get(name);
    if (!consumer) {
      throw new Error(`Queue consumer '${name}' is not registered`);
    }

    return consumer;
  }

  private registerContainerBindings(container?: Container): void {
    if (!container) {
      return;
    }

    const anyContainer = container as any;
    if (typeof anyContainer.registerNamedInstance === "function") {
      anyContainer.registerNamedInstance(getQueueLifecycleToken(), this);
    }

    if (typeof anyContainer.registerWithName === "function") {
      anyContainer.registerWithName(QueueService, { scope: "singleton" }, getQueueServiceToken());
    }
  }

  private syncStartedState(): void {
    this.started = this.activeConsumers.size > 0;
  }
}

const lifecycleManager = new QueueLifecycleManager();

export const initializeQueueIntegration = async (
  container?: Container,
  lifecycle?: ApplicationLifeCycle
): Promise<void> => {
  await lifecycleManager.initialize(container, lifecycle);
};

export const shutdownQueueIntegration = async (): Promise<void> => {
  await lifecycleManager.destroy();
};

export const getQueueLifecycleManager = (): QueueLifecycleManager => {
  return lifecycleManager;
};

export const resetQueueIntegration = async (): Promise<void> => {
  await shutdownQueueIntegration();
  clearRegisteredQueueTransports();
  resetQueueConfiguration();
};