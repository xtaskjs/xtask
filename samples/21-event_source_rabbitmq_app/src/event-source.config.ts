import {
  createQueueEventPublisher,
  createTypeOrmEventStore,
  EventSource,
} from "@xtaskjs/event-source";

@EventSource({
  store: createTypeOrmEventStore({
    dataSourceName: "event-source-db",
    tableName: process.env.EVENT_STORE_TABLE || "user_event_store",
  }),
  publisher: createQueueEventPublisher({
    queue: (event) => `domain.${event.stream}.${event.eventName}`,
    transportName: "rabbitmq",
  }),
})
export class EventSourceSampleConfiguration {}