import { AutoWired, Qualifier } from "@xtaskjs/core";
import { EventSourceBus } from "./bus";
import { configureEventSource } from "./configuration";
import {
  defineEventSourcedAggregateMetadata,
  defineEventSourceSubscriberMetadata,
  registerApplyEventMetadata,
  resolveEventSourceName,
} from "./metadata";
import {
  getEventPublisherToken,
  getEventSourceBusToken,
  getEventSourceLifecycleToken,
  getEventSourceRepositoryToken,
  getEventStoreToken,
} from "./tokens";
import { EventSourceOptions, EventSourceReference, EventSourcedAggregateOptions } from "./types";

const applyQualifier = (token: string): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const EventSource = (options: EventSourceOptions = {}): ClassDecorator => {
  return () => {
    configureEventSource(options);
  };
};

export const EventSourcedAggregate = (
  options: EventSourcedAggregateOptions = {}
): ClassDecorator => {
  return (target) => {
    defineEventSourcedAggregateMetadata(target, options);
  };
};

export const ApplyEvent = (event: EventSourceReference): MethodDecorator => {
  return (target, propertyKey) => {
    registerApplyEventMetadata(target.constructor, {
      eventName: resolveEventSourceName(event),
      method: propertyKey,
    });
  };
};

export const EventSourceSubscriber = (
  event: EventSourceReference | EventSourceReference[]
): ClassDecorator => {
  return (target) => {
    defineEventSourceSubscriberMetadata(target, Array.isArray(event) ? event : [event]);
  };
};

export const StoredEventSubscriber = EventSourceSubscriber;

export const InjectEventStore = (): ParameterDecorator & PropertyDecorator => {
  return applyQualifier(getEventStoreToken());
};

export const InjectEventSourceBus = (): ParameterDecorator & PropertyDecorator => {
  return applyQualifier(getEventSourceBusToken());
};

export const InjectEventPublisher = (): ParameterDecorator & PropertyDecorator => {
  return applyQualifier(getEventPublisherToken());
};

export const InjectEventSourceLifecycleManager = (): ParameterDecorator & PropertyDecorator => {
  return applyQualifier(getEventSourceLifecycleToken());
};

export const InjectEventSourceRepository = (
  aggregate: EventSourceReference
): ParameterDecorator & PropertyDecorator => {
  return applyQualifier(getEventSourceRepositoryToken(aggregate));
};

export type { EventSourceBus };