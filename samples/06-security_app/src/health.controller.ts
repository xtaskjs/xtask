import { AllowAnonymous } from "@xtaskjs/security";
import { Controller, Get, Logger } from "@xtaskjs/common";

@Controller("/")
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  @AllowAnonymous()
  home() {
    return {
      message: "xTaskJS sample is running",
      endpoints: ["/health"],
    };
  }

  @Get("/health")
  @AllowAnonymous()
  check() {
    this.logger.info("Security sample health endpoint called");
    return {
      status: "ok",
      security: true,
      timestamp: new Date().toISOString(),
    };
  }
}