import {
  EventPublisherFactory,
  EventSourceOptions,
  EventStoreFactory,
  IEventPublisher,
  IEventStore,
} from "./types";
import { InMemoryEventStore, NoopEventPublisher } from "./lifecycle";

interface EventSourceResolvedOptions {
  store: IEventStore | EventStoreFactory;
  publisher: IEventPublisher | EventPublisherFactory;
  autoPublish: boolean;
  failOnMissingApply: boolean;
}

const createDefaultConfiguration = (): EventSourceResolvedOptions => ({
  store: new InMemoryEventStore(),
  publisher: new NoopEventPublisher(),
  autoPublish: true,
  failOnMissingApply: false,
});

let configuration: EventSourceResolvedOptions = createDefaultConfiguration();

export const configureEventSource = (
  options: EventSourceOptions = {}
): EventSourceResolvedOptions => {
  configuration = {
    ...configuration,
    ...options,
    store: options.store || configuration.store,
    publisher: options.publisher || configuration.publisher,
    autoPublish: options.autoPublish ?? configuration.autoPublish,
    failOnMissingApply: options.failOnMissingApply ?? configuration.failOnMissingApply,
  };

  return getEventSourceConfiguration();
};

export const getEventSourceConfiguration = (): EventSourceResolvedOptions => ({
  ...configuration,
});

export const resetEventSourceConfiguration = (): void => {
  configuration = createDefaultConfiguration();
};