import { Controller, Get } from "@xtaskjs/common";
import { Logger } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  check() {
    this.logger.info("Throttler sample health check endpoint called");
    return {
      status: "ok",
      sample: "throttler",
      timestamp: new Date().toISOString(),
    };
  }
}
