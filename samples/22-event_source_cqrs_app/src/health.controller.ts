import { Controller, Get } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  @Get("/")
  check() {
    return {
      status: "ok",
      adapter: "node-http",
      stack: "event-source+cqrs+typeorm+sqlite",
      timestamp: new Date().toISOString(),
    };
  }
}