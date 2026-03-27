import { Cqrs } from "@xtaskjs/cqrs";

@Cqrs({
  writeDataSourceName: "write-db",
  readDataSourceName: "read-db",
})
export class CqrsSampleConfiguration {}