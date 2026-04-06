import { Service } from "@xtaskjs/core";
import { InjectSocketService, SocketIoService } from "@xtaskjs/socket-io";

@Service()
export class SocketDemoService {
  constructor(
    @InjectSocketService()
    private readonly sockets: SocketIoService
  ) {}

  publishAnnouncement(message: string) {
    const payload = {
      message,
      level: "info",
      sentAt: new Date().toISOString(),
      source: "http-controller",
    };

    this.sockets.emit("server.announcement", payload, {
      namespace: "/chat",
      room: "lobby",
    });

    return payload;
  }
}