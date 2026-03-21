import { createRequire } from "module";
import { join } from "path";
import {
  QueueConsumerPolicy,
  QueueHeaders,
  QueueMatchPattern,
  QueueSubscriptionDefinition,
  QueueSubscriptionHandle,
  QueueSubscriptionMessage,
  QueueTransport,
  QueueTransportMessage,
} from "./types";

type RabbitMqLibraryLike = {
  connect: (url: string | string[], socketOptions?: any) => Promise<any>;
};

type MqttLibraryLike = {
  connect: (brokerUrl: string, options?: any) => any;
};

const getApplicationRequire = (): NodeRequire | undefined => {
  try {
    return createRequire(join(process.cwd(), "package.json"));
  } catch {
    return undefined;
  }
};

const requireFromApplication = <T = any>(moduleName: string): T => {
  try {
    return require(moduleName) as T;
  } catch (error: any) {
    const isMissingCurrentModule =
      error?.code === "MODULE_NOT_FOUND" &&
      String(error?.message || "").includes(`'${moduleName}'`);

    if (!isMissingCurrentModule) {
      throw error;
    }

    const applicationRequire = getApplicationRequire();
    if (!applicationRequire) {
      throw error;
    }

    return applicationRequire(moduleName) as T;
  }
};

type RabbitMqTransportHookContext = {
  transportName: string;
  url?: string | string[];
  attempt?: number;
};

type MqttTransportHookContext = {
  transportName: string;
  brokerUrl?: string;
  attempt?: number;
};

export type QueuePayloadSerializer = (
  payload: any,
  message: QueueTransportMessage<any>
) => Buffer | Uint8Array | string;

export type QueuePayloadDeserializer = (
  payload: Buffer,
  context: {
    queue: string;
    transportName: string;
    headers: QueueHeaders;
    raw: any;
  }
) => any;

export interface RabbitMqTransportOptions {
  transportName?: string;
  url?: string;
  urls?: string[];
  socketOptions?: any;
  exchange?: string;
  exchangeType?: "direct" | "fanout" | "topic" | "headers" | string;
  exchangeOptions?: any;
  queueOptions?: any;
  subscriptionQueueOptions?: any;
  deadLetterExchange?: string;
  deadLetterExchangeType?: "direct" | "fanout" | "topic" | "headers" | string;
  deadLetterExchangeOptions?: any;
  deadLetterRoutingKey?: string | ((definition: QueueSubscriptionDefinition) => string | undefined);
  publishOptions?: any;
  consumeOptions?: any;
  qos?: number;
  prefetch?: number;
  reconnect?: boolean;
  reconnectDelayMs?: number;
  onConnect?: (context: RabbitMqTransportHookContext) => void | Promise<void>;
  onDisconnect?: (
    reason: "close" | "disconnect" | "error",
    context: RabbitMqTransportHookContext
  ) => void | Promise<void>;
  onReconnectAttempt?: (context: RabbitMqTransportHookContext) => void | Promise<void>;
  onReconnect?: (context: RabbitMqTransportHookContext) => void | Promise<void>;
  onError?: (error: Error, context: RabbitMqTransportHookContext) => void | Promise<void>;
  serializer?: QueuePayloadSerializer;
  deserializer?: QueuePayloadDeserializer;
  patternSubscriptionKey?: string;
  competingQueueNameFactory?: (definition: QueueSubscriptionDefinition) => string;
  amqp?: RabbitMqLibraryLike;
}

export interface MqttTransportOptions {
  transportName?: string;
  brokerUrl?: string;
  connectOptions?: any;
  publishOptions?: any;
  subscribeOptions?: any;
  qos?: 0 | 1 | 2;
  subscribeQos?: 0 | 1 | 2;
  retain?: boolean;
  reconnectPeriod?: number;
  onConnect?: (context: MqttTransportHookContext) => void | Promise<void>;
  onDisconnect?: (
    reason: "close" | "disconnect" | "offline" | "end" | "error",
    context: MqttTransportHookContext
  ) => void | Promise<void>;
  onReconnectAttempt?: (context: MqttTransportHookContext) => void | Promise<void>;
  onReconnect?: (context: MqttTransportHookContext) => void | Promise<void>;
  onError?: (error: Error, context: MqttTransportHookContext) => void | Promise<void>;
  topicPrefix?: string;
  patternSubscriptionTopic?: string;
  serializer?: QueuePayloadSerializer;
  deserializer?: QueuePayloadDeserializer;
  sharedSubscriptionPrefix?: string;
  mqtt?: MqttLibraryLike;
  client?: any;
}

const wait = async (durationMs: number): Promise<void> => {
  if (!durationMs || durationMs <= 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

const defaultSerializer: QueuePayloadSerializer = (payload) => {
  if (Buffer.isBuffer(payload)) {
    return payload;
  }

  if (payload instanceof Uint8Array) {
    return Buffer.from(payload);
  }

  if (typeof payload === "string") {
    return payload;
  }

  return JSON.stringify(payload);
};

const defaultDeserializer: QueuePayloadDeserializer = (payload) => {
  const text = payload.toString("utf8");
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const toBufferPayload = (value: Buffer | Uint8Array | string): Buffer => {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }

  return Buffer.from(String(value));
};

const loadRabbitMqLibrary = (customLibrary?: RabbitMqLibraryLike): RabbitMqLibraryLike => {
  if (customLibrary) {
    return customLibrary;
  }

  try {
    return requireFromApplication<RabbitMqLibraryLike>("amqplib");
  } catch (error: any) {
    const missingModule =
      error?.code === "MODULE_NOT_FOUND" || String(error?.message || "").includes("amqplib");
    if (missingModule) {
      throw new Error(
        "RabbitMQ transport helper requires 'amqplib'. Install it with: npm install amqplib"
      );
    }

    throw error;
  }
};

const loadMqttLibrary = (customLibrary?: MqttLibraryLike): MqttLibraryLike => {
  if (customLibrary) {
    return customLibrary;
  }

  try {
    return requireFromApplication<MqttLibraryLike>("mqtt");
  } catch (error: any) {
    const missingModule =
      error?.code === "MODULE_NOT_FOUND" || String(error?.message || "").includes("mqtt");
    if (missingModule) {
      throw new Error("MQTT transport helper requires 'mqtt'. Install it with: npm install mqtt");
    }

    throw error;
  }
};

const escapeRegExp = (value: string): string => {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
};

const matchPattern = (
  pattern: QueueMatchPattern | undefined,
  queue: string,
  message: QueueSubscriptionMessage<any>,
  options?: {
    separator?: string;
    singleWildcard?: string;
    manyWildcard?: string;
  }
): boolean => {
  if (!pattern) {
    return false;
  }

  if (typeof pattern === "function") {
    return pattern(queue, message);
  }

  if (pattern instanceof RegExp) {
    return pattern.test(queue);
  }

  const separator = options?.separator || ".";
  const singleWildcard = options?.singleWildcard || "*";
  const manyWildcard = options?.manyWildcard || "#";

  const expression = pattern
    .split("")
    .map((character) => {
      if (character === manyWildcard) {
        return ".*";
      }

      if (character === singleWildcard) {
        return `[^${escapeRegExp(separator)}]+`;
      }

      return escapeRegExp(character);
    })
    .join("");

  return new RegExp(`^${expression}$`).test(queue);
};

const withTopicPrefix = (topic: string, prefix?: string): string => {
  if (!prefix) {
    return topic;
  }

  const normalizedPrefix = prefix.replace(/\/+$/, "");
  const normalizedTopic = topic.replace(/^\/+/, "");
  return `${normalizedPrefix}/${normalizedTopic}`;
};

const stripTopicPrefix = (topic: string, prefix?: string): string => {
  if (!prefix) {
    return topic;
  }

  const normalizedPrefix = prefix.replace(/\/+$/, "");
  const expectedPrefix = `${normalizedPrefix}/`;
  return topic.startsWith(expectedPrefix) ? topic.slice(expectedPrefix.length) : topic;
};

const createNoopHandle = (): QueueSubscriptionHandle => ({
  stop: async () => undefined,
  pause: async () => undefined,
  resume: async () => undefined,
});

const toError = (value: any): Error => {
  return value instanceof Error ? value : new Error(String(value));
};

const invokeHook = async (hook: ((...args: any[]) => any) | undefined, ...args: any[]): Promise<void> => {
  if (typeof hook !== "function") {
    return;
  }

  await Promise.resolve(hook(...args));
};

const normalizeConsumerGroupName = (
  definition: QueueSubscriptionDefinition,
  fallback: string
): string => {
  return (definition.consumerGroup || fallback).replace(/[^a-zA-Z0-9_.-]+/g, "_");
};

const resolveRabbitMqQueueName = (
  definition: QueueSubscriptionDefinition,
  options: RabbitMqTransportOptions,
  canBindPattern: boolean
): string | undefined => {
  if (definition.queue) {
    return definition.queue;
  }

  if (!definition.pattern) {
    return undefined;
  }

  if (definition.consumerPolicy === "competing") {
    if (typeof options.competingQueueNameFactory === "function") {
      return options.competingQueueNameFactory(definition);
    }

    if (canBindPattern) {
      return normalizeConsumerGroupName(
        definition,
        String(definition.pattern).replace(/[^a-zA-Z0-9_.-]+/g, "_")
      );
    }

    return normalizeConsumerGroupName(definition, definition.consumerName);
  }

  return `${definition.consumerName}.subscription`;
};

const toMqttSubscriptionTopic = (
  topic: string,
  definition: QueueSubscriptionDefinition,
  options: MqttTransportOptions
): string => {
  if (definition.consumerPolicy !== "competing") {
    return topic;
  }

  const groupName = normalizeConsumerGroupName(definition, definition.consumerName);
  const sharedSubscriptionPrefix = options.sharedSubscriptionPrefix || "$share";
  return `${sharedSubscriptionPrefix}/${groupName}/${topic}`;
};

export const createRabbitMqTransport = (
  options: RabbitMqTransportOptions = {}
): QueueTransport => {
  const serializer = options.serializer || defaultSerializer;
  const deserializer = options.deserializer || defaultDeserializer;
  const reconnectEnabled = options.reconnect !== false;
  const reconnectDelayMs = options.reconnectDelayMs ?? 1000;
  const transportName = options.transportName || "rabbitmq";
  const hookContextBase: RabbitMqTransportHookContext = {
    transportName,
    url: options.urls?.length ? options.urls : options.url || "amqp://localhost",
  };
  let connection: any;
  let channel: any;
  let connected = false;
  let manualDisconnect = false;
  let reconnectAttempt = 0;
  let eventListenersAttached = false;

  const attachConnectionListeners = (activeConnection: any): void => {
    if (!activeConnection || typeof activeConnection.on !== "function" || eventListenersAttached) {
      return;
    }

    eventListenersAttached = true;
    activeConnection.on("close", () => {
      connected = false;
      channel = undefined;
      connection = undefined;
      void invokeHook(options.onDisconnect, "close", hookContextBase);
    });
    activeConnection.on("error", (error: any) => {
      connected = false;
      channel = undefined;
      connection = undefined;
      void invokeHook(options.onError, toError(error), hookContextBase);
      void invokeHook(options.onDisconnect, "error", hookContextBase);
    });
  };

  const ensureChannel = async (): Promise<any> => {
    if (channel) {
      return channel;
    }

    if (!manualDisconnect && reconnectAttempt > 0) {
      await invokeHook(options.onReconnectAttempt, {
        ...hookContextBase,
        attempt: reconnectAttempt,
      });
    }

    const amqp = loadRabbitMqLibrary(options.amqp);
    const target = options.urls?.length ? options.urls : options.url || "amqp://localhost";
    connection = await amqp.connect(target, options.socketOptions);
    eventListenersAttached = false;
    attachConnectionListeners(connection);
    channel = await (typeof connection.createConfirmChannel === "function"
      ? connection.createConfirmChannel()
      : connection.createChannel());

    if (options.exchange && typeof channel.assertExchange === "function") {
      await channel.assertExchange(
        options.exchange,
        options.exchangeType || "topic",
        options.exchangeOptions || { durable: true }
      );
    }

    if (options.deadLetterExchange && typeof channel.assertExchange === "function") {
      await channel.assertExchange(
        options.deadLetterExchange,
        options.deadLetterExchangeType || "topic",
        options.deadLetterExchangeOptions || { durable: true }
      );
    }

    const brokerQos = options.qos ?? options.prefetch;
    if (brokerQos && typeof channel.prefetch === "function") {
      await channel.prefetch(brokerQos);
    }

    connected = true;
    const currentAttempt = reconnectAttempt;
    reconnectAttempt = 0;
    await invokeHook(options.onConnect, hookContextBase);
    if (currentAttempt > 0) {
      await invokeHook(options.onReconnect, {
        ...hookContextBase,
        attempt: currentAttempt,
      });
    }
    return channel;
  };

  const buildQueueArguments = (definition?: QueueSubscriptionDefinition): Record<string, any> => {
    const argumentsValue: Record<string, any> = {};
    if (options.deadLetterExchange) {
      argumentsValue["x-dead-letter-exchange"] = options.deadLetterExchange;
    }

    const deadLetterRoutingKey =
      typeof options.deadLetterRoutingKey === "function"
        ? options.deadLetterRoutingKey(definition || { consumerName: "anonymous" } as QueueSubscriptionDefinition)
        : options.deadLetterRoutingKey;
    if (deadLetterRoutingKey) {
      argumentsValue["x-dead-letter-routing-key"] = deadLetterRoutingKey;
    }

    return argumentsValue;
  };

  return {
    connect: async () => {
      manualDisconnect = false;
      await ensureChannel();
    },
    disconnect: async () => {
      manualDisconnect = true;
      connected = false;

      if (channel && typeof channel.close === "function") {
        await Promise.resolve(channel.close());
      }
      if (connection && typeof connection.close === "function") {
        await Promise.resolve(connection.close());
      }

      channel = undefined;
      connection = undefined;
      await invokeHook(options.onDisconnect, "disconnect", hookContextBase);
    },
    isConnected: () => connected,
    publish: async (queue, message) => {
      if (!connected && reconnectEnabled) {
        reconnectAttempt += 1;
      }
      const activeChannel = await ensureChannel();
      await wait(message.delayMs);

      const payload = toBufferPayload(serializer(message.payload, message));
      const publishProperties = {
        ...(options.publishOptions || {}),
        headers: { ...(message.headers || {}) },
        correlationId: message.correlationId,
        replyTo: message.replyTo,
        persistent: message.persistent,
        timestamp: message.timestamp.getTime(),
      };

      if (options.exchange) {
        return activeChannel.publish(options.exchange, queue, payload, publishProperties);
      }

      if (typeof activeChannel.assertQueue === "function") {
        await activeChannel.assertQueue(queue, {
          durable: true,
          ...(options.queueOptions || {}),
          arguments: {
            ...buildQueueArguments(),
            ...((options.queueOptions && options.queueOptions.arguments) || {}),
          },
        });
      }

      return activeChannel.sendToQueue(queue, payload, publishProperties);
    },
    subscribe: async (definition) => {
      if (!connected && reconnectEnabled) {
        reconnectAttempt += 1;
      }
      const activeChannel = await ensureChannel();
      const requestedPrefetch = Math.max(options.qos || 0, options.prefetch || 0, definition.concurrency || 0);
      if (requestedPrefetch > 0 && typeof activeChannel.prefetch === "function") {
        await activeChannel.prefetch(requestedPrefetch);
      }

      const needsPatternQueue = Boolean(definition.pattern);
      const canBindPattern = typeof definition.pattern === "string";
      const queueName = resolveRabbitMqQueueName(definition, options, canBindPattern);
      if (!queueName) {
        throw new Error(`RabbitMQ transport requires a queue name for consumer '${definition.consumerName}'`);
      }

      if (typeof activeChannel.assertQueue === "function") {
        await activeChannel.assertQueue(
          queueName,
          needsPatternQueue
            ? {
                durable: false,
                autoDelete: true,
                ...(options.subscriptionQueueOptions || {}),
                arguments: {
                  ...buildQueueArguments(definition),
                  ...((options.subscriptionQueueOptions && options.subscriptionQueueOptions.arguments) || {}),
                },
              }
            : {
                durable: true,
                ...(options.queueOptions || {}),
                arguments: {
                  ...buildQueueArguments(definition),
                  ...((options.queueOptions && options.queueOptions.arguments) || {}),
                },
              }
        );
      }

      if (options.exchange && typeof activeChannel.bindQueue === "function") {
        const routingKey = canBindPattern
          ? definition.pattern
          : definition.queue || options.patternSubscriptionKey || "#";
        await activeChannel.bindQueue(queueName, options.exchange, routingKey);
      } else if (definition.pattern) {
        throw new Error(
          `RabbitMQ transport pattern subscriptions require an exchange for consumer '${definition.consumerName}'`
        );
      }

      const consumeResult = await activeChannel.consume(
        queueName,
        async (rawMessage: any) => {
          if (!rawMessage) {
            return;
          }

          const resolvedQueue = rawMessage.fields?.routingKey || definition.queue || queueName;
          const headers = { ...(rawMessage.properties?.headers || {}) };
          const subscriptionMessage: QueueSubscriptionMessage<any> = {
            queue: resolvedQueue,
            transportName: "rabbitmq",
            payload: deserializer(Buffer.from(rawMessage.content || Buffer.alloc(0)), {
              queue: resolvedQueue,
              transportName: "rabbitmq",
              headers,
              raw: rawMessage,
            }),
            headers,
            key: rawMessage.properties?.messageId,
            correlationId: rawMessage.properties?.correlationId,
            replyTo: rawMessage.properties?.replyTo,
            timestamp: rawMessage.properties?.timestamp
              ? new Date(rawMessage.properties.timestamp)
              : new Date(),
            persistent: rawMessage.properties?.persistent,
            raw: rawMessage,
            ack: async () => {
              if (typeof activeChannel.ack === "function") {
                activeChannel.ack(rawMessage);
              }
            },
            nack: async (nackOptions) => {
              if (typeof activeChannel.nack === "function") {
                activeChannel.nack(rawMessage, false, nackOptions?.requeue === true);
              }
            },
          };

          if (
            definition.pattern &&
            !canBindPattern &&
            !matchPattern(definition.pattern, resolvedQueue, subscriptionMessage, {
              separator: ".",
              singleWildcard: "*",
              manyWildcard: "#",
            })
          ) {
            await subscriptionMessage.ack?.();
            return;
          }

          await definition.handler(subscriptionMessage);
        },
        options.consumeOptions || {}
      );

      return {
        stop: async () => {
          if (consumeResult?.consumerTag && typeof activeChannel.cancel === "function") {
            await activeChannel.cancel(consumeResult.consumerTag);
          }
        },
        pause: async () => {
          if (consumeResult?.consumerTag && typeof activeChannel.cancel === "function") {
            await activeChannel.cancel(consumeResult.consumerTag);
          }
        },
        resume: async () => {
          return undefined;
        },
      };
    },
  };
};

export const createMqttTransport = (
  options: MqttTransportOptions = {}
): QueueTransport => {
  const serializer = options.serializer || defaultSerializer;
  const deserializer = options.deserializer || defaultDeserializer;
  const topicReferenceCounts = new Map<string, number>();
  const transportName = options.transportName || "mqtt";
  const hookContextBase: MqttTransportHookContext = {
    transportName,
    brokerUrl: options.brokerUrl || "mqtt://localhost",
  };
  let client: any = options.client;
  let clientListenersAttached = false;

  const attachClientListeners = (mqttClient: any): void => {
    if (!mqttClient || typeof mqttClient.on !== "function" || clientListenersAttached) {
      return;
    }

    clientListenersAttached = true;
    mqttClient.on("connect", () => {
      void invokeHook(options.onConnect, hookContextBase);
    });
    mqttClient.on("reconnect", () => {
      void invokeHook(options.onReconnectAttempt, hookContextBase);
      void invokeHook(options.onReconnect, hookContextBase);
    });
    mqttClient.on("close", () => {
      void invokeHook(options.onDisconnect, "close", hookContextBase);
    });
    mqttClient.on("offline", () => {
      void invokeHook(options.onDisconnect, "offline", hookContextBase);
    });
    mqttClient.on("end", () => {
      void invokeHook(options.onDisconnect, "end", hookContextBase);
    });
    mqttClient.on("error", (error: any) => {
      void invokeHook(options.onError, toError(error), hookContextBase);
      void invokeHook(options.onDisconnect, "error", hookContextBase);
    });
  };

  const ensureClient = async (): Promise<any> => {
    if (client) {
      attachClientListeners(client);
      return client;
    }

    const mqtt = loadMqttLibrary(options.mqtt);
    client = mqtt.connect(options.brokerUrl || "mqtt://localhost", {
      ...(options.connectOptions || {}),
      reconnectPeriod:
        options.connectOptions?.reconnectPeriod !== undefined
          ? options.connectOptions.reconnectPeriod
          : options.reconnectPeriod,
    });
    attachClientListeners(client);
    return client;
  };

  const subscribeToTopic = async (topic: string, mqttClient: any): Promise<void> => {
    const currentCount = topicReferenceCounts.get(topic) || 0;
    topicReferenceCounts.set(topic, currentCount + 1);
    if (currentCount > 0) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      mqttClient.subscribe(
        topic,
        {
          ...(options.subscribeOptions || {}),
          qos:
            options.subscribeOptions?.qos !== undefined
              ? options.subscribeOptions.qos
              : options.subscribeQos,
        },
        (error: any) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
        }
      );
    });
  };

  const unsubscribeFromTopic = async (topic: string, mqttClient: any): Promise<void> => {
    const currentCount = topicReferenceCounts.get(topic) || 0;
    if (currentCount <= 1) {
      topicReferenceCounts.delete(topic);
      await new Promise<void>((resolve, reject) => {
        mqttClient.unsubscribe(topic, (error: any) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
      return;
    }

    topicReferenceCounts.set(topic, currentCount - 1);
  };

  return {
    connect: async () => {
      await ensureClient();
    },
    disconnect: async () => {
      if (!client) {
        return;
      }

      await new Promise<void>((resolve) => {
        if (typeof client.end === "function") {
          client.end(false, {}, () => resolve());
          return;
        }

        resolve();
      });
      client = undefined;
      topicReferenceCounts.clear();
    },
    isConnected: () => Boolean(client?.connected ?? client),
    publish: async (queue, message) => {
      const mqttClient = await ensureClient();
      await wait(message.delayMs);

      const topic = withTopicPrefix(queue, options.topicPrefix);
      const payload = serializer(message.payload, message);
      const headers = { ...(message.headers || {}) };
      const finalPublishOptions = {
        ...(options.publishOptions || {}),
        qos:
          options.publishOptions?.qos !== undefined ? options.publishOptions.qos : options.qos,
        properties: {
          userProperties: headers,
          correlationData: message.correlationId,
          responseTopic: message.replyTo,
          ...(options.publishOptions?.properties || {}),
        },
        retain:
          options.publishOptions?.retain !== undefined ? options.publishOptions.retain : options.retain,
      };

      await new Promise<void>((resolve, reject) => {
        mqttClient.publish(topic, payload, finalPublishOptions, (error: any) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
    subscribe: async (definition) => {
      const mqttClient = await ensureClient();
      const directTopic = definition.queue ? withTopicPrefix(definition.queue, options.topicPrefix) : undefined;
      const rawFilterTopic = definition.pattern
        ? typeof definition.pattern === "string"
          ? withTopicPrefix(definition.pattern, options.topicPrefix)
          : withTopicPrefix(options.patternSubscriptionTopic || "#", options.topicPrefix)
        : directTopic;

      const filterTopic = rawFilterTopic
        ? toMqttSubscriptionTopic(rawFilterTopic, definition, options)
        : undefined;

      if (!filterTopic) {
        return createNoopHandle();
      }

      await subscribeToTopic(filterTopic, mqttClient);

      const onMessage = async (topic: string, payload: Buffer, packet: any) => {
        const resolvedQueue = stripTopicPrefix(topic, options.topicPrefix);
        const headers = { ...(packet?.properties?.userProperties || {}) };
        const subscriptionMessage: QueueSubscriptionMessage<any> = {
          queue: resolvedQueue,
          transportName: "mqtt",
          payload: deserializer(Buffer.from(payload || Buffer.alloc(0)), {
            queue: resolvedQueue,
            transportName: "mqtt",
            headers,
            raw: packet,
          }),
          headers,
          correlationId: packet?.properties?.correlationData,
          replyTo: packet?.properties?.responseTopic,
          timestamp: new Date(),
          raw: packet,
          ack: async () => undefined,
          nack: async () => undefined,
        };

        if (definition.queue && resolvedQueue !== definition.queue) {
          return;
        }

        if (
          definition.pattern &&
          !matchPattern(definition.pattern, resolvedQueue, subscriptionMessage, {
            separator: "/",
            singleWildcard: "+",
            manyWildcard: "#",
          })
        ) {
          return;
        }

        await definition.handler(subscriptionMessage);
      };

      mqttClient.on("message", onMessage);

      return {
        stop: async () => {
          if (typeof mqttClient.off === "function") {
            mqttClient.off("message", onMessage);
          } else if (typeof mqttClient.removeListener === "function") {
            mqttClient.removeListener("message", onMessage);
          }

          await unsubscribeFromTopic(filterTopic, mqttClient);
        },
        pause: async () => {
          if (typeof mqttClient.off === "function") {
            mqttClient.off("message", onMessage);
          } else if (typeof mqttClient.removeListener === "function") {
            mqttClient.removeListener("message", onMessage);
          }
        },
        resume: async () => {
          mqttClient.on("message", onMessage);
        },
      };
    },
  };
};