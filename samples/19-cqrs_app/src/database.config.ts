import { TypeOrmDataSource } from "@xtaskjs/typeorm";
import { UserProjectionEntity } from "./user-projection.entity";
import { UserWriteEntity } from "./user-write.entity";

@TypeOrmDataSource({
  name: "write-db",
  type: "sqlite",
  database: process.env.WRITE_DB_PATH || "xtask-cqrs-write.sqlite",
  entities: [UserWriteEntity],
  synchronize: true,
})
export class WriteDatabaseConfig {}

@TypeOrmDataSource({
  name: "read-db",
  type: "sqlite",
  database: process.env.READ_DB_PATH || "xtask-cqrs-read.sqlite",
  entities: [UserProjectionEntity],
  synchronize: true,
})
export class ReadDatabaseConfig {}