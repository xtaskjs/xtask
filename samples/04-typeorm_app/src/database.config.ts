import { TypeOrmDataSource } from "@xtaskjs/typeorm";
import { UserEntity } from "./user.entity";

@TypeOrmDataSource({
  name: "default",
  type: "sqlite",
  database: process.env.DB_PATH || "xtask-typeorm.sqlite",
  entities: [UserEntity],
  synchronize: true,
})
export class DatabaseConfig {}
