import { Controller, Get } from "@xtaskjs/common";

@Controller("/")
export class HealthController {

  @Get("/")
  home() {
    return {
      message: "xTaskJS sample is running",
      endpoints: ["/health"],
    };
  }

  @Get("/health")
  check() {
    return {
      status: "ok",
      adapter: "node-http",
      stack: "cqrs+typeorm+sqlite",
      timestamp: new Date().toISOString(),
    };
  }
}