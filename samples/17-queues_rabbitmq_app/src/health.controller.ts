import { Controller, Get, Logger } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  check() {
    this.logger.info("Queues RabbitMQ sample health check endpoint called");
    return {
      status: "ok",
      sample: "queues-rabbitmq",
      timestamp: new Date().toISOString(),
    };
  }
}