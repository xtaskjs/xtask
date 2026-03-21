import type { ApplicationLifeCycle, Container } from "@xtaskjs/core";

export type QueueHeaders = Record<string, any>;
export type QueueDelayInput = number | string;
export type QueueGroupInput = string | string[];
export type QueueRetryStrategy = "fixed" | "exponential";
export type QueueConsumerPolicy = "broadcast" | "competing";

export interface QueueSubscriptionMessage<T = any> {
  queue: string;
  transportName: string;
  payload: T;
  headers: QueueHeaders;
  key?: string;
  correlationId?: string;
  replyTo?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  persistent?: boolean;
  raw?: any;
  ack?: () => Promise<void> | void;
  nack?: (options?: { requeue?: boolean }) => Promise<void> | void;
}

export type QueuePatternMatcher = (
  queue: string,
  message: QueueSubscriptionMessage<any>
) => boolean;

export type QueueMatchPattern = string | RegExp | QueuePatternMatcher;

export interface QueuePublishOptions {
  transportName?: string;
  headers?: QueueHeaders;
  key?: string;
  correlationId?: string;
  replyTo?: string;
  delay?: QueueDelayInput;
  metadata?: Record<string, any>;
  persistent?: boolean;
  raw?: any;
}

export interface QueueTransportMessage<T = any>
  extends Omit<QueuePublishOptions, "transportName" | "delay"> {
  payload: T;
  queue: string;
  transportName: string;
  timestamp: Date;
  delayMs?: number;
}

export interface QueueSubscriptionDefinition {
  consumerName: string;
  queue?: string;
  pattern?: QueueMatchPattern;
  concurrency?: number;
  consumerPolicy?: QueueConsumerPolicy;
  consumerGroup?: string;
  handler: (message: QueueSubscriptionMessage<any>) => Promise<any> | any;
}

export interface QueueSubscriptionHandle {
  stop?: () => Promise<void> | void;
  pause?: () => Promise<void> | void;
  resume?: () => Promise<void> | void;
}

export interface QueueTransportFactoryContext {
  name: string;
  container?: Container;
  lifecycle?: ApplicationLifeCycle;
}

export type QueueTransportFactory = (
  context: QueueTransportFactoryContext
) => QueueTransport | Promise<QueueTransport>;

export interface QueueTransport {
  connect?: () => Promise<void> | void;
  disconnect?: () => Promise<void> | void;
  isConnected?: () => boolean;
  publish: <T = any>(queue: string, message: QueueTransportMessage<T>) => Promise<any>;
  subscribe: (
    definition: QueueSubscriptionDefinition
  ) => QueueSubscriptionHandle | Promise<QueueSubscriptionHandle>;
}

export interface RegisteredQueueTransportOptions {
  name?: string;
  kind?: string;
  connectOnInitialize?: boolean;
  disconnectOnShutdown?: boolean;
  transport: QueueTransport | QueueTransportFactory;
}

export interface QueueConfiguration {
  autoStart?: boolean;
  defaultTransportName?: string;
  failOnDuplicateHandlerNames?: boolean;
  rethrowUnhandledErrors?: boolean;
  autoCreateDefaultInMemoryTransport?: boolean;
}

export interface QueueHandlerOptions {
  name?: string;
  transportName?: string;
  disabled?: boolean;
  autoStart?: boolean;
  concurrency?: number;
  group?: QueueGroupInput;
  requeueOnError?: boolean;
  stopOnError?: boolean;
  maxRetries?: number;
  retryDelay?: QueueDelayInput;
  retryStrategy?: QueueRetryStrategy;
  deadLetterQueue?: string;
  deadLetterTransportName?: string;
  consumerPolicy?: QueueConsumerPolicy;
  consumerGroup?: string;
  queue?: string;
  pattern?: QueueMatchPattern;
}

export interface QueueHandlerMetadata {
  method: string | symbol;
  options: QueueHandlerOptions;
}

export interface QueueHandlerContext<T = any> {
  name: string;
  queue: string;
  transportName: string;
  targetName: string;
  methodName: string;
  groups: string[];
  attempt: number;
  maxRetries: number;
  deadLetterQueue?: string;
  message: QueueSubscriptionMessage<T>;
  ack: () => Promise<void>;
  nack: (requeue?: boolean) => Promise<void>;
  publish: <TPayload = any>(
    queue: string,
    payload: TPayload,
    options?: QueuePublishOptions
  ) => Promise<any>;
}

export interface QueueConsumerSummary {
  name: string;
  queue?: string;
  pattern?: string;
  transportName: string;
  disabled: boolean;
  autoStart: boolean;
  started: boolean;
  targetName: string;
  methodName: string;
  groups: string[];
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
}

export interface QueueTransportSummary {
  name: string;
  kind: string;
  connected: boolean;
}

export interface QueueProducerDefaults extends QueuePublishOptions {
  queue?: string;
}

export interface QueueProducer {
  publish: <T = any>(
    payload: T,
    options?: QueuePublishOptions & { queue?: string }
  ) => Promise<any>;
}