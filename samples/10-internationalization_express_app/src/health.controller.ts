import { Controller, Get, Logger } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  check() {
    this.logger.info("Internationalization express sample health endpoint called");
    return {
      status: "ok",
      sample: "10-internationalization_express_app",
      adapter: "express",
      timestamp: new Date().toISOString(),
    };
  }
}