import { Controller, Get } from "@xtaskjs/common"
import { Logger } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
 
  constructor(private logger: Logger) {}
  @Get("/")
  
  check() {
    this.logger.info("Health check endpoint called");
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
