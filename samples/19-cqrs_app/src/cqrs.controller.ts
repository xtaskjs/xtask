import { Body, Controller, Get, Post } from "@xtaskjs/common";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import {
  CommandBus,
  InjectCommandBus,
  InjectCqrsLifecycleManager,
  InjectQueryBus,
  QueryBus,
} from "@xtaskjs/cqrs";
import { CreateUserCommand, InspectCqrsStateQuery, ListUsersQuery } from "./messages";

class CreateUserRequest {
  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}

@Controller("/cqrs")
export class CqrsController {
  constructor(
    @InjectCommandBus()
    private readonly commandBus: CommandBus,
    @InjectQueryBus()
    private readonly queryBus: QueryBus,
    @InjectCqrsLifecycleManager()
    private readonly cqrs: any
  ) {}

  @Get("/")
  describe() {
    return {
      sample: "19-cqrs_app",
      description: "CQRS sample with separate write and read SQLite databases",
      endpoints: [
        "GET /cqrs/users",
        "POST /cqrs/users",
        "GET /cqrs/debug/state",
        "POST /cqrs/projections/rebuild",
      ],
      databases: {
        write: process.env.WRITE_DB_PATH || "xtask-cqrs-write.sqlite",
        read: process.env.READ_DB_PATH || "xtask-cqrs-read.sqlite",
      },
      projectionRebuilders: this.cqrs.listProjectionRebuilders(),
    };
  }

  @Get("/users")
  async listUsers() {
    return this.queryBus.execute(new ListUsersQuery());
  }

  @Get("/debug/state")
  async state() {
    return this.queryBus.execute(new InspectCqrsStateQuery());
  }

  @Post("/users")
  async createUser(@Body() body: CreateUserRequest) {
    return this.commandBus.execute(
      new CreateUserCommand(body.displayName, body.email, body.requestId)
    );
  }

  @Post("/projections/rebuild")
  async rebuildProjections() {
    const rebuilt = await this.cqrs.rebuildAllProjections();
    return {
      rebuilt,
      count: rebuilt.length,
    };
  }
}