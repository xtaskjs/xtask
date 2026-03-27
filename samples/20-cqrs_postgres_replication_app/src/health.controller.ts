import { Controller, Get } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  @Get("/")
  check() {
    return {
      status: "ok",
      adapter: "node-http",
      stack: "cqrs+typeorm+postgresql-replication",
      timestamp: new Date().toISOString(),
    };
  }
}