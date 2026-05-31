import { TypeOrmDataSource } from "@xtaskjs/typeorm";
import { UserEntity } from "./user.entity";

@TypeOrmDataSource({
  name: "default",
  type: "sqljs",
  location: process.env.DB_PATH || "xtask-typeorm.sqlite",
  autoSave: true,
  entities: [UserEntity],
  synchronize: false,
  runMigrationsOnServerStart: true,
  runSeedersOnServerStart: true,
})
export class DatabaseConfig {}
