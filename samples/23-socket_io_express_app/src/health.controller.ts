import { Controller, Get } from "@xtaskjs/common";

@Controller("/health")
export class HealthController {
  @Get("/")
  health() {
    return {
      status: "ok",
      sample: "23-socket_io_express_app",
      transport: "socket.io",
    };
  }
}