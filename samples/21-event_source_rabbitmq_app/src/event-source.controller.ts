import { Body, Controller, Get, Param, Post } from "@xtaskjs/common";
import { EventSourceDemoService, RegisterUserRequest } from "./event-source.demo.service";

@Controller("/event-source")
export class EventSourceController {
  constructor(private readonly demo: EventSourceDemoService) {}

  @Get("/")
  describe() {
    return this.demo.describe();
  }

  @Get("/users")
  async listUsers() {
    return this.demo.listUsers();
  }

  @Get("/streams/:id")
  async inspectStream(@Param("id") id: string) {
    return this.demo.inspectStream(id);
  }

  @Get("/status")
  async status() {
    return this.demo.getStatus();
  }

  @Post("/users")
  async register(@Body() body: RegisterUserRequest) {
    return this.demo.registerUser(body);
  }

  @Post("/users/:id/verify-email")
  async verifyEmail(@Param("id") id: string) {
    return this.demo.verifyUserEmail(id);
  }
}