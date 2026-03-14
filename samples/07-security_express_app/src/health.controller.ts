import { AllowAnonymous } from "@xtaskjs/security";
import { Controller, Get, Logger } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  @AllowAnonymous()
  check() {
    this.logger.info("Express security sample health endpoint called");
    return {
      status: "ok",
      adapter: "express",
      security: true,
      timestamp: new Date().toISOString(),
    };
  }
}