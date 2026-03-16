import { Controller, Get, Logger } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  check() {
    this.logger.info("Scheduler sample health check endpoint called");
    return {
      status: "ok",
      sample: "scheduler",
      timestamp: new Date().toISOString(),
    };
  }
}