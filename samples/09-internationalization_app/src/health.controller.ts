import { Controller, Get, Logger } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  check() {
    this.logger.info("Internationalization sample health endpoint called");
    return {
      status: "ok",
      sample: "09-internationalization_app",
      timestamp: new Date().toISOString(),
    };
  }
}