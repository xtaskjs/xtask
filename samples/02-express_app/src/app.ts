import express from "express";
import { CreateApplication } from "@xtaskjs/core";
import { ExpressAdapter } from "@xtaskjs/express-http";

async function main() {
  const expressApp = express();
  expressApp.use(express.json());

  await CreateApplication({
    adapter: new ExpressAdapter(expressApp),
    autoListen: true,
    server: {
      host: "127.0.0.1",
      port: Number(process.env.PORT || 3000),
    },
  });
}

main().catch((error) => {
  console.error("Error starting the application:", error);
});
