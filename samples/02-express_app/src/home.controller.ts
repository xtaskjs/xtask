import { Controller, Get, Logger } from "@xtaskjs/common";
import { view } from "@xtaskjs/core";

@Controller("/")
export class HomeController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  home() {
    this.logger.info("Rendering home page");
    return view("home", {
      title: "xTaskJS + Express Template Engine",
      subtitle: "Rendered from external views/home.html and assets from public/",
    });
  }
}
