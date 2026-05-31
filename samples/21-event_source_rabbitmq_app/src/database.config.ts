import { TypeOrmDataSource } from "@xtaskjs/typeorm";
import { UserProjectionEntity } from "./user-projection.entity";

@TypeOrmDataSource({
  name: "event-source-db",
  type: "sqljs",
  location: process.env.EVENT_SOURCE_DB_PATH || "xtask-event-source.sqlite",
  autoSave: true,
  entities: [UserProjectionEntity],
  synchronize: true,
})
export class EventSourceDatabaseConfig {}