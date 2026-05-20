import { Service } from "@xtaskjs/core";
import {
  DataSource,
  InjectRepository,
  Repository,
  TypeOrmSeeder,
} from "@xtaskjs/typeorm";
import { UserEntity } from "../user.entity";

@Service({ scope: "singleton" })
@TypeOrmSeeder({ dataSourceName: "default", order: 1 })
export class DefaultUsersSeeder {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>) {}

  async run(_dataSource: DataSource): Promise<void> {
    const existingUsers = await this.users.count();
    if (existingUsers > 0) {
      return;
    }

    await this.users.save(
      this.users.create({
        name: "Ada Lovelace",
      })
    );
  }
}