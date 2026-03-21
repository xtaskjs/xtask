import { Body, Controller, Get, Param, Post } from "@xtaskjs/common";
import { CreateOrderRequest, QueueDemoService } from "./queue-demo.service";

@Controller("/queues")
export class QueuesController {
  constructor(private readonly queueDemoService: QueueDemoService) {}

  @Get("/")
  describe() {
    return {
      sample: "17-queues_rabbitmq_app",
      endpoints: [
        "GET /queues/status",
        "POST /queues/orders",
        "POST /queues/orders/:id/fail",
        "POST /queues/orders/:id/complete",
      ],
    };
  }

  @Get("/status")
  getStatus() {
    return this.queueDemoService.getSnapshot();
  }

  @Post("/orders")
  async publishOrder(@Body() body: CreateOrderRequest) {
    return this.queueDemoService.publishOrder(body);
  }

  @Post("/orders/:id/fail")
  async publishFailingOrder(@Param("id") id: string) {
    return this.queueDemoService.publishFailingOrder(id);
  }

  @Post("/orders/:id/complete")
  async completeOrder(@Param("id") id: string) {
    return this.queueDemoService.completeOrder(id);
  }
}