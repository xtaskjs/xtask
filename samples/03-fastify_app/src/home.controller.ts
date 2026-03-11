import { Controller, Get, Logger } from "@xtaskjs/common";
import { view } from "@xtaskjs/core";

@Controller("/")
export class HomeController {
  constructor(private readonly logger: Logger) {}

  @(Get("/") as any)
  home() {
    this.logger.info("Rendering home page");
    return view("home", {
      title: "xTaskJS + Fastify Template Engine",
    });
  }
}
