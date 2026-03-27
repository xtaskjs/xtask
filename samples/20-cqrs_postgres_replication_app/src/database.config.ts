import { TypeOrmDataSource } from "@xtaskjs/typeorm";
import { UserProjectionEntity } from "./user-projection.entity";
import { UserWriteEntity } from "./user-write.entity";

const sharedConnection = {
  type: "postgres" as const,
  username: process.env.PG_USER || "xtask",
  password: process.env.PG_PASSWORD || "xtask",
  database: process.env.PG_DATABASE || "xtask_cqrs",
  logging: false,
};

@TypeOrmDataSource({
  ...sharedConnection,
  name: "pg-master",
  host: process.env.PG_MASTER_HOST || "127.0.0.1",
  port: Number(process.env.PG_MASTER_PORT || 5433),
  entities: [UserWriteEntity, UserProjectionEntity],
  synchronize: true,
})
export class PostgresMasterDataSource {}

@TypeOrmDataSource({
  ...sharedConnection,
  name: "pg-slave",
  host: process.env.PG_SLAVE_HOST || "127.0.0.1",
  port: Number(process.env.PG_SLAVE_PORT || 5434),
  entities: [UserProjectionEntity],
  synchronize: false,
})
export class PostgresSlaveDataSource {}