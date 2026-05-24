import { Controller, Get } from "@xtaskjs/common"
import { Logger } from "@xtaskjs/common";

@Controller("/")
export class HealthController {
 
  constructor(private logger: Logger) {}

  @Get("/")
  home() {
    return {
      message: "xTaskJS sample is running",
      endpoints: ["/health"],
    };
  }

  @Get("/health")
  
  check() {
    this.logger.info("Health check endpoint called");
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
