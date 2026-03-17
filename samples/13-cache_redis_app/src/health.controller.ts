import { Controller, Get, Logger } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  check() {
    this.logger.info("Redis cache sample health check endpoint called");
    return {
      status: "ok",
      sample: "cache-redis",
      timestamp: new Date().toISOString(),
    };
  }
}