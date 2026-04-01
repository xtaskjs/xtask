import { TypeOrmDataSource } from "@xtaskjs/typeorm";
import { UserProjectionEntity } from "./user-projection.entity";

@TypeOrmDataSource({
  name: "event-source-db",
  type: "sqlite",
  database: process.env.EVENT_SOURCE_DB_PATH || "xtask-event-source-cqrs-write.sqlite",
  entities: [],
  synchronize: true,
})
export class EventSourceDatabaseConfig {}

@TypeOrmDataSource({
  name: "read-db",
  type: "sqlite",
  database: process.env.READ_DB_PATH || "xtask-event-source-cqrs-read.sqlite",
  entities: [UserProjectionEntity],
  synchronize: true,
})
export class ReadDatabaseConfig {}