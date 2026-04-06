import { Controller, Get } from "@xtaskjs/common";
import { view } from "@xtaskjs/core";

@Controller("/")
export class HomeController {
  @Get("/")
  home() {
    return view("home", {
      title: "xTaskJS + Socket.IO",
      subtitle: "Decorated gateways, DI-aware broadcasts, and lifecycle-managed realtime wiring.",
      namespace: "/chat",
      room: "lobby",
    });
  }
}