import "reflect-metadata";

export * from "./aggregate";
export * from "./bus";
export * from "./configuration";
export * from "./decorators";
export * from "./lifecycle";
export * from "./metadata";
export * from "./repository";
export * from "./tokens";
export * from "./typeorm-store";
export * from "./types";

import type { EventEnvelope, IEventPublisher } from "./types";
import {
	QueueEventPublisher as QueueBackedEventPublisher,
	type QueueEventPublisherOptions,
} from "./queue-publisher";

export type { QueueEventPublisherOptions };

export class QueueEventPublisher implements IEventPublisher {
	private readonly publisher: IEventPublisher;

	constructor(options: QueueEventPublisherOptions = {}) {
		this.publisher = new QueueBackedEventPublisher(options);
	}

	async publish(events: EventEnvelope<any>[]): Promise<void> {
		await this.publisher.publish(events);
	}
}

export const createQueueEventPublisher = (
	options: QueueEventPublisherOptions = {}
): QueueEventPublisher => new QueueEventPublisher(options);