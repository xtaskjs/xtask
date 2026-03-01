import { Controller, Get, Logger } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  check() {
    this.logger.info("Health check endpoint called");
    return {
      status: "ok",
      adapter: "express",
      timestamp: new Date().toISOString(),
    };
  }
}
