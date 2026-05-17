import "reflect-metadata";
import assert from "assert";
import { Module, Test } from "@xtaskjs/testing";
import { SocketDemoService } from "./socket-demo.service";

const emittedEvents: Array<{ event: string; payload: any; options: any }> = [];

const mockSocketService = {
  emit: (event: string, payload: any, options: any) => {
    emittedEvents.push({ event, payload, options });
  },
};

@Module({
  providers: [
    SocketDemoService,
    { provide: "xtask:socket-io:service", useValue: mockSocketService },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const socketService = moduleRef.get(SocketDemoService);

  // Test: publishAnnouncement emits to the chat namespace
  const announcement = socketService.publishAnnouncement("Hello, world!");
  assert.strictEqual(announcement.message, "Hello, world!");
  assert.strictEqual(announcement.level, "info");
  assert.strictEqual(announcement.source, "http-controller");
  assert.ok(typeof announcement.sentAt === "string");

  // Test: event was emitted via socket service
  assert.strictEqual(emittedEvents.length, 1);
  assert.strictEqual(emittedEvents[0].event, "server.announcement");
  assert.strictEqual(emittedEvents[0].options.namespace, "/chat");
  assert.strictEqual(emittedEvents[0].options.room, "lobby");

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
