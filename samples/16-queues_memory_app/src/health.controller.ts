import { Controller, Get, Logger } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  check() {
    this.logger.info("Queues memory sample health check endpoint called");
    return {
      status: "ok",
      sample: "queues-memory",
      timestamp: new Date().toISOString(),
    };
  }
}