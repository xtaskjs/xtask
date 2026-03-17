import { Controller, Get, Logger } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  check() {
    this.logger.info("HTTP cache web sample health check endpoint called");
    return {
      status: "ok",
      sample: "http-cache-web",
      adapter: "express",
      timestamp: new Date().toISOString(),
    };
  }
}