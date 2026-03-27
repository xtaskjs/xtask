import { Cqrs } from "@xtaskjs/cqrs";

@Cqrs({
  writeDataSourceName: "pg-master",
  readDataSourceName: "pg-slave",
})
export class CqrsPostgresReplicationConfig {}