import { TypeOrmDataSource } from "@xtaskjs/typeorm";
import { UserProjectionEntity } from "./user-projection.entity";

@TypeOrmDataSource({
  name: "event-source-db",
  type: "sqljs",
  location: process.env.EVENT_SOURCE_DB_PATH || "xtask-event-source-cqrs-write.sqlite",
  autoSave: true,
  entities: [],
  synchronize: true,
})
export class EventSourceDatabaseConfig {}

@TypeOrmDataSource({
  name: "read-db",
  type: "sqljs",
  location: process.env.READ_DB_PATH || "xtask-event-source-cqrs-read.sqlite",
  autoSave: true,
  entities: [UserProjectionEntity],
  synchronize: true,
})
export class ReadDatabaseConfig {}