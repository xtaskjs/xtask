import { Body, Controller, Get, Post } from "@xtaskjs/common";
import { SchemaDto } from "@xtaskjs/validation";
import { z } from "zod";
import {
  CommandBus,
  InjectCommandBus,
  InjectCqrsLifecycleManager,
  InjectQueryBus,
  QueryBus,
} from "@xtaskjs/cqrs";
import { CreateUserCommand, InspectCqrsStateQuery, ListUsersQuery } from "./messages";

@SchemaDto(
  z.object({
    displayName: z.string().trim().min(2),
    email: z.string().trim().email(),
    requestId: z.string().trim().min(1).optional(),
  })
)
class CreateUserRequest {
  displayName!: string;

  email!: string;

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