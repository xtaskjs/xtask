import { Controller, Get, Logger } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  check() {
    this.logger.info("Fastify HTTP cache web sample health check endpoint called");
    return {
      status: "ok",
      sample: "fastify-http-cache-web",
      adapter: "fastify",
      timestamp: new Date().toISOString(),
    };
  }
}