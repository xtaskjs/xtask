import { Controller, Get, Logger } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  check() {
    this.logger.info("Value objects sample health check endpoint called");
    return {
      status: "ok",
      sample: "value-objects",
      timestamp: new Date().toISOString(),
    };
  }
}