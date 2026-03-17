import { Controller, Get, Logger } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  check() {
    this.logger.info("Cache sample health check endpoint called");
    return {
      status: "ok",
      sample: "cache-local",
      timestamp: new Date().toISOString(),
    };
  }
}