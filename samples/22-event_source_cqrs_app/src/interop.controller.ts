import { Body, Controller, Get, Param, Post } from "@xtaskjs/common";
import { InjectQueryBus, QueryBus } from "@xtaskjs/cqrs";
import { EventSourceDemoService, RegisterUserRequest } from "./event-source.demo.service";
import { InspectInteropStateQuery, ListUsersQuery } from "./queries";

@Controller("/interop")
export class InteropController {
  constructor(
    private readonly eventSource: EventSourceDemoService,
    @InjectQueryBus()
    private readonly queryBus: QueryBus
  ) {}

  @Get("/")
  describe() {
    return {
      sample: "22-event_source_cqrs_app",
      description: "Event-source writes feeding CQRS projections and queries.",
      endpoints: [
        "GET /interop/users",
        "GET /interop/state",
        "GET /interop/streams/:id",
        "POST /interop/users",
        "POST /interop/users/:id/verify-email",
      ],
      databases: {
        write: process.env.EVENT_SOURCE_DB_PATH || "xtask-event-source-cqrs-write.sqlite",
        read: process.env.READ_DB_PATH || "xtask-event-source-cqrs-read.sqlite",
      },
      eventStoreTable: process.env.EVENT_STORE_TABLE || "interop_event_store",
    };
  }

  @Get("/users")
  async listUsers() {
    return this.queryBus.execute(new ListUsersQuery());
  }

  @Get("/state")
  async state() {
    return this.queryBus.execute(new InspectInteropStateQuery());
  }

  @Get("/streams/:id")
  async inspectStream(@Param("id") id: string) {
    return this.eventSource.inspectStream(id);
  }

  @Post("/users")
  async createUser(@Body() body: RegisterUserRequest) {
    return this.eventSource.registerUser(body);
  }

  @Post("/users/:id/verify-email")
  async verifyEmail(@Param("id") id: string) {
    return this.eventSource.verifyUserEmail(id);
  }
}