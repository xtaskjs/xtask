import { Service } from "@xtaskjs/core";
import { InjectRepository, Repository } from "@xtaskjs/typeorm";
import { UserEntity } from "./user.entity";

@Service({ scope: "singleton" })
export class UsersService {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>) {}

  async listUsers(): Promise<UserEntity[]> {
    return this.users.find({ order: { id: "ASC" } });
  }

  async createUser(name: string): Promise<UserEntity> {
    const entity = this.users.create({ name });
    return this.users.save(entity);
  }
}
