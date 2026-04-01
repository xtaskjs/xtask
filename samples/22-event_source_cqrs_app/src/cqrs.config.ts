import { Cqrs } from "@xtaskjs/cqrs";

@Cqrs({
  writeDataSourceName: "event-source-db",
  readDataSourceName: "read-db",
})
export class CqrsInteropConfiguration {}