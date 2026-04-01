import { createTypeOrmEventStore, EventSource } from "@xtaskjs/event-source";

@EventSource({
  store: createTypeOrmEventStore({
    dataSourceName: "event-source-db",
    tableName: process.env.EVENT_STORE_TABLE || "interop_event_store",
  }),
})
export class EventSourceInteropConfiguration {}