import { Body, Controller, Get, Param, Post } from "@xtaskjs/common";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import {
  CommandBus,
  InjectCommandBus,
  InjectCqrsLifecycleManager,
  InjectQueryBus,
  QueryBus,
} from "@xtaskjs/cqrs";
import { CreateUserCommand, InspectReplicationStateQuery, ListUsersQuery, RenameUserCommand } from "./messages";

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

class RenameUserRequest {
  @IsString()
  @MinLength(2)
  displayName!: string;

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
      sample: "20-cqrs_postgres_replication_app",
      description: "CQRS sample using PostgreSQL master/slave replication with master-only writes and slave-only reads",
      endpoints: [
        "GET /cqrs/users",
        "GET /cqrs/debug/state",
        "POST /cqrs/users",
        "POST /cqrs/users/:id/rename",
        "POST /cqrs/projections/rebuild",
      ],
      masterConnection: {
        host: process.env.PG_MASTER_HOST || "127.0.0.1",
        port: Number(process.env.PG_MASTER_PORT || 5433),
      },
      slaveConnection: {
        host: process.env.PG_SLAVE_HOST || "127.0.0.1",
        port: Number(process.env.PG_SLAVE_PORT || 5434),
      },
      rebuilderNames: this.cqrs.listProjectionRebuilders(),
    };
  }

  @Get("/users")
  async listUsers() {
    return this.queryBus.execute(new ListUsersQuery());
  }

  @Get("/debug/state")
  async state() {
    return this.queryBus.execute(new InspectReplicationStateQuery());
  }

  @Post("/users")
  async createUser(@Body() body: CreateUserRequest) {
    return this.commandBus.execute(
      new CreateUserCommand(body.displayName, body.email, body.requestId)
    );
  }

  @Post("/users/:id/rename")
  async renameUser(@Param("id") id: string, @Body() body: RenameUserRequest) {
    return this.commandBus.execute(
      new RenameUserCommand(Number(id), body.displayName, body.requestId)
    );
  }

  @Post("/projections/rebuild")
  async rebuildProjections() {
    const rebuilt = await this.cqrs.rebuildAllProjections();
    return {
      rebuilt,
      count: rebuilt.length,
      note: "Projection rows are rebuilt on the master and then replicated to the slave.",
    };
  }
}