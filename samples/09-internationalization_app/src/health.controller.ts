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
    this.logger.info("Internationalization sample health endpoint called");
    return {
      status: "ok",
      sample: "09-internationalization_app",
      timestamp: new Date().toISOString(),
    };
  }
}