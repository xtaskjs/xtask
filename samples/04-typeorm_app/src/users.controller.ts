import { Controller, Get, Logger, Post } from "@xtaskjs/common";
import { UsersService } from "./users.service";

@Controller("/users")
export class UsersController {
  constructor(
    private readonly logger: Logger,
    private readonly usersService: UsersService
  ) {}

  @Get("/")
  async list() {
    return this.usersService.listUsers();
  }

  @Post("/seed")
  async seed() {
    const name = `user-${Date.now()}`;
    const created = await this.usersService.createUser(name);
    this.logger.info(`Created sample user ${created.id}`);
    return created;
  }
}
