import { Controller, Get, Logger } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  check() {
    this.logger.info("Email express sample health endpoint called");
    return {
      status: "ok",
      sample: "08-email_express_app",
      adapter: "express",
      timestamp: new Date().toISOString(),
    };
  }
}