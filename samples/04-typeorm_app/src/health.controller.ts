import { Controller, Get } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  @Get("/")
  check() {
    return {
      status: "ok",
      adapter: "fastify",
      stack: "typeorm+sqlite",
      timestamp: new Date().toISOString(),
    };
  }
}
