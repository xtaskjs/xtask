import {
  QueueMatchPattern,
  QueueSubscriptionDefinition,
  QueueSubscriptionHandle,
  QueueSubscriptionMessage,
  QueueTransport,
  QueueTransportMessage,
} from "./types";

interface RegisteredSubscription {
  id: number;
  definition: QueueSubscriptionDefinition;
  paused: boolean;
}

interface DeliveryTarget {
  subscription: RegisteredSubscription;
  message: QueueSubscriptionMessage<any>;
}

const patternToRegExp = (pattern: string): RegExp => {
  const expression = pattern
    .split("")
    .map((character) => {
      if (character === "#") {
        return ".*";
      }

      if (character === "*" || character === "+") {
        return "[^.]+";
      }

      return character.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
    })
    .join("");

  return new RegExp(`^${expression}$`);
};

const matchesPattern = (
  pattern: QueueMatchPattern | undefined,
  queue: string,
  message: QueueSubscriptionMessage<any>
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

  return patternToRegExp(pattern).test(queue);
};

export class InMemoryQueueTransport implements QueueTransport {
  private readonly subscriptions = new Map<number, RegisteredSubscription>();
  private readonly competingOffsets = new Map<string, number>();
  private nextSubscriptionId = 1;
  private connected = false;

  connect(): void {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
    this.subscriptions.clear();
    this.competingOffsets.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  async publish<T = any>(queue: string, message: QueueTransportMessage<T>): Promise<void> {
    if (!this.connected) {
      throw new Error("In-memory queue transport is not connected");
    }

    const delayMs = Math.max(0, message.delayMs || 0);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        void this.deliver(queue, message).finally(resolve);
      }, delayMs);
    });
  }

  subscribe(definition: QueueSubscriptionDefinition): QueueSubscriptionHandle {
    const id = this.nextSubscriptionId++;
    const registeredSubscription: RegisteredSubscription = {
      id,
      definition,
      paused: false,
    };

    this.subscriptions.set(id, registeredSubscription);

    return {
      stop: () => {
        this.subscriptions.delete(id);
      },
      pause: () => {
        registeredSubscription.paused = true;
      },
      resume: () => {
        registeredSubscription.paused = false;
      },
    };
  }

  private async deliver<T = any>(queue: string, message: QueueTransportMessage<T>): Promise<void> {
    const matchingSubscriptions = Array.from(this.subscriptions.values())
      .filter((subscription) => !subscription.paused)
      .filter((subscription) => {
        if (subscription.definition.queue) {
          return subscription.definition.queue === queue;
        }

        const candidateMessage: QueueSubscriptionMessage<T> = {
          queue,
          transportName: message.transportName,
          payload: message.payload,
          headers: { ...(message.headers || {}) },
          key: message.key,
          correlationId: message.correlationId,
          replyTo: message.replyTo,
          timestamp: message.timestamp,
          metadata: message.metadata ? { ...message.metadata } : undefined,
          persistent: message.persistent,
          raw: message.raw,
        };

        return matchesPattern(subscription.definition.pattern, queue, candidateMessage);
      });

    const broadcastTargets: DeliveryTarget[] = [];
    const competingGroups = new Map<string, DeliveryTarget[]>();

    for (const subscription of matchingSubscriptions) {
      const subscriptionMessage: QueueSubscriptionMessage<T> = {
        queue,
        transportName: message.transportName,
        payload: message.payload,
        headers: { ...(message.headers || {}) },
        key: message.key,
        correlationId: message.correlationId,
        replyTo: message.replyTo,
        timestamp: message.timestamp,
        metadata: message.metadata ? { ...message.metadata } : undefined,
        persistent: message.persistent,
        raw: message.raw,
      };

      const target = {
        subscription,
        message: subscriptionMessage,
      };

      if (subscription.definition.consumerPolicy === "competing") {
        const competitionKey = [
          subscription.definition.queue || patternToKey(subscription.definition.pattern),
          subscription.definition.consumerGroup || "default",
        ].join("::");
        const existingTargets = competingGroups.get(competitionKey) || [];
        existingTargets.push(target);
        competingGroups.set(competitionKey, existingTargets);
        continue;
      }

      broadcastTargets.push(target);
    }

    const deliveries = [
      ...broadcastTargets,
      ...Array.from(competingGroups.entries()).map(([competitionKey, targets]) => {
        const nextOffset = this.competingOffsets.get(competitionKey) || 0;
        const selectedTarget = targets[nextOffset % targets.length];
        this.competingOffsets.set(competitionKey, (nextOffset + 1) % targets.length);
        return selectedTarget;
      }),
    ].map(async ({ message: subscriptionMessage, subscription }) => {
        let settled = false;
        subscriptionMessage.ack = async () => {
          settled = true;
        };
        subscriptionMessage.nack = async (options) => {
          if (settled) {
            return;
          }

          settled = true;
          if (options?.requeue) {
            await this.publish(queue, {
              ...message,
              queue,
              timestamp: new Date(),
              delayMs: 0,
            });
          }
        };

        await subscription.definition.handler(subscriptionMessage);
      });

    await Promise.all(deliveries);
  }
}

const patternToKey = (pattern?: QueueMatchPattern): string => {
  if (!pattern) {
    return "pattern:any";
  }

  if (typeof pattern === "function") {
    return "pattern:function";
  }

  return `pattern:${pattern.toString()}`;
};

export const createInMemoryQueueTransport = (): QueueTransport => {
  return new InMemoryQueueTransport();
};