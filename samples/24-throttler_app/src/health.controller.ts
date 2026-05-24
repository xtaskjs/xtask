import { Controller, Get } from "@xtaskjs/common";
import { Logger } from "@xtaskjs/common";

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
    this.logger.info("Throttler sample health check endpoint called");
    return {
      status: "ok",
      sample: "throttler",
      timestamp: new Date().toISOString(),
    };
  }
}
