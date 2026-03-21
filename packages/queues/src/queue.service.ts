import {
  QueueConsumerSummary,
  QueueProducer,
  QueueProducerDefaults,
  QueuePublishOptions,
  QueueTransport,
  QueueTransportSummary,
} from "./types";
import { getQueueLifecycleManager } from "./lifecycle";

export class QueueService {
  listConsumers(group?: string): QueueConsumerSummary[] {
    return getQueueLifecycleManager().listConsumers(group);
  }

  listGroups(): string[] {
    return getQueueLifecycleManager().listGroups();
  }

  listTransportNames(): string[] {
    return getQueueLifecycleManager().listTransportNames();
  }

  listTransports(): QueueTransportSummary[] {
    return getQueueLifecycleManager().listTransports();
  }

  getTransport(name?: string): QueueTransport {
    return getQueueLifecycleManager().getTransport(name);
  }

  isStarted(): boolean {
    return getQueueLifecycleManager().isStarted();
  }

  async startAll(): Promise<void> {
    await getQueueLifecycleManager().startAll();
  }

  async stopAll(): Promise<void> {
    await getQueueLifecycleManager().stopAll();
  }

  async startGroup(group: string): Promise<void> {
    await getQueueLifecycleManager().startGroup(group);
  }

  async stopGroup(group: string): Promise<void> {
    await getQueueLifecycleManager().stopGroup(group);
  }

  async startConsumer(name: string): Promise<void> {
    await getQueueLifecycleManager().startConsumer(name);
  }

  async stopConsumer(name: string): Promise<void> {
    await getQueueLifecycleManager().stopConsumer(name);
  }

  async publish<T = any>(
    queue: string,
    payload: T,
    options?: QueuePublishOptions
  ): Promise<any> {
    return getQueueLifecycleManager().publish(queue, payload, options);
  }

  createProducer(defaults: QueueProducerDefaults = {}): QueueProducer {
    return getQueueLifecycleManager().createProducer(defaults);
  }
}