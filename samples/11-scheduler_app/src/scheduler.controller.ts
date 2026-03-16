import { Controller, Get } from "@xtaskjs/common";
import { SchedulerDemoService } from "./scheduler-demo.service";

@Controller("/scheduler")
export class SchedulerController {
  constructor(private readonly schedulerDemoService: SchedulerDemoService) {}

  @Get("/status")
  getStatus() {
    return this.schedulerDemoService.getSnapshot();
  }

  @Get("/groups")
  getGroups() {
    return {
      groups: this.schedulerDemoService.getGroups(),
    };
  }

  @Get("/run-maintenance")
  async runMaintenance() {
    return this.schedulerDemoService.runMaintenanceNow();
  }
}