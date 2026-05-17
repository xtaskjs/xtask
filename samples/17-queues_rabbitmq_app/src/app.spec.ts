import "reflect-metadata";
import assert from "assert";
import { Logger } from "@xtaskjs/common";
import { Module, Test } from "@xtaskjs/testing";
import { QueueDemoService } from "./queue-demo.service";

const mockLogger = {
  info: (_: string) => {},
  warn: (_: string) => {},
  error: (_: string) => {},
};

const publishedMessages: Array<{ queue: string; payload: any }> = [];

const mockQueueService = {
  publish: async (queue: string, payload: any, _options?: any) => {
    publishedMessages.push({ queue, payload });
  },
  isStarted: () => true,
  listGroups: () => ["orders", "notifications", "demo"],
  listTransports: () => [{ name: "rabbitmq", type: "amqp" }],
  listConsumers: () => [],
};

@Module({
  providers: [
    QueueDemoService,
    { provide: Logger, useValue: mockLogger },
    { provide: "xtask:queues:service", useValue: mockQueueService },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const queueService = moduleRef.get(QueueDemoService);

  // Test: publishOrder publishes to orders.created queue
  const result = await queueService.publishOrder({ orderId: "order-100", customerId: "c-42" });
  assert.strictEqual(result.accepted, true);
  assert.strictEqual(result.queue, "orders.created");
  assert.strictEqual(result.payload.orderId, "order-100");

  // Test: message published to expected queue
  const orderMsg = publishedMessages.find((m) => m.queue === "orders.created");
  assert.ok(orderMsg !== undefined);
  assert.strictEqual(orderMsg!.payload.customerId, "c-42");

  // Test: second publishOrder with auto-generated orderId
  const result2 = await queueService.publishOrder({ customerId: "c-99" });
  assert.strictEqual(result2.accepted, true);
  assert.ok(result2.payload.orderId.startsWith("order-"));

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
