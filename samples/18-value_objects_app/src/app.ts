import "reflect-metadata";
import { CreateApplication } from "@xtaskjs/core";

async function main() {
  await CreateApplication({
    adapter: "node-http",
    autoListen: true,
    server: {
      host: "127.0.0.1",
      port: Number(process.env.PORT || 3000),
    },
  });
}

main().catch((error) => {
  console.error("Error starting the value objects sample:", error);
});