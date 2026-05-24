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
    this.logger.info("Email express sample health endpoint called");
    return {
      status: "ok",
      sample: "08-email_express_app",
      adapter: "express",
      timestamp: new Date().toISOString(),
    };
  }
}