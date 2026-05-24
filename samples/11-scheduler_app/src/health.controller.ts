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
    this.logger.info("Scheduler sample health check endpoint called");
    return {
      status: "ok",
      sample: "scheduler",
      timestamp: new Date().toISOString(),
    };
  }
}