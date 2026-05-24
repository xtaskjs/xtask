import { Controller, Get, Logger } from "@xtaskjs/common";

@Controller("/")
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  home() {
    return {
      message: "xTaskJS sample is running",
      endpoints: ["/health"],
    };
  }

  @Get("/health")
  check() {
    this.logger.info("Redis cache sample health check endpoint called");
    return {
      status: "ok",
      sample: "cache-redis",
      timestamp: new Date().toISOString(),
    };
  }
}