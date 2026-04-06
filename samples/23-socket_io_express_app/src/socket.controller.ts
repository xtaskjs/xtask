import { Controller, Get, Param } from "@xtaskjs/common";
import { SocketDemoGateway } from "./socket-demo.gateway";
import { SocketDemoService } from "./socket-demo.service";

@Controller("/socket")
export class SocketController {
  constructor(
    private readonly gateway: SocketDemoGateway,
    private readonly socketDemoService: SocketDemoService
  ) {}

  @Get("/")
  describe() {
    return {
      sample: "23-socket_io_express_app",
      namespace: "/chat",
      events: [
        "chat.join",
        "chat.message",
        "room.joined",
        "chat.message",
        "server.announcement",
        "presence.updated",
        "server.state",
      ],
      endpoints: [
        "GET /socket/status",
        "GET /socket/announce/:message",
      ],
    };
  }

  @Get("/status")
  status() {
    return this.gateway.getSnapshot();
  }

  @Get("/announce/:message")
  announce(@Param("message") message: string) {
    return this.socketDemoService.publishAnnouncement(message);
  }
}