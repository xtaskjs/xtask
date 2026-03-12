import "reflect-metadata";
import fastify from "fastify";
import { CreateApplication } from "@xtaskjs/core";
import { FastifyAdapter } from "@xtaskjs/fastify-http";

async function main() {
  const fastifyApp = fastify({ logger: true });

  await CreateApplication({
    adapter: new FastifyAdapter(fastifyApp),
    autoListen: true,
    server: {
      host: "127.0.0.1",
      port: Number(process.env.PORT || 3000),
    },
  });
}

main().catch((error) => {
  console.error("Error starting the TypeORM sample:", error);
});
