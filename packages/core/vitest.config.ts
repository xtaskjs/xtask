import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import swc from "unplugin-swc";

export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: "typescript", decorators: true },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
        target: "es2022",
      },
      module: { type: "nodenext" },
    }),
  ],
  test: {
    environment: "node",
    globals: true,
    include: ["test/**/*.test.ts"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
    server: {
      deps: {
        inline: [/@xtaskjs\/.*/],
      },
    },
  },
  resolve: {
    extensions: [".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs", ".json"],
    alias: [
      { find: "@xtaskjs/common", replacement: fileURLToPath(new URL("../common/src/index.ts", import.meta.url)) },
      { find: /@xtaskjs\/common\/(.*)/, replacement: fileURLToPath(new URL("../common/src/$1", import.meta.url)) },
      { find: "@xtaskjs/cache", replacement: fileURLToPath(new URL("../cache/src/index.ts", import.meta.url)) },
      { find: /@xtaskjs\/cache\/(.*)/, replacement: fileURLToPath(new URL("../cache/src/$1", import.meta.url)) },
      { find: "@xtaskjs/cqrs", replacement: fileURLToPath(new URL("../cqrs/src/index.ts", import.meta.url)) },
      { find: /@xtaskjs\/cqrs\/(.*)/, replacement: fileURLToPath(new URL("../cqrs/src/$1", import.meta.url)) },
      { find: "@xtaskjs/express-http", replacement: fileURLToPath(new URL("../express-http/src/index.ts", import.meta.url)) },
      { find: /@xtaskjs\/express-http\/(.*)/, replacement: fileURLToPath(new URL("../express-http/src/$1", import.meta.url)) },
      { find: "@xtaskjs/fastify-http", replacement: fileURLToPath(new URL("../fastify-http/src/index.ts", import.meta.url)) },
      { find: /@xtaskjs\/fastify-http\/(.*)/, replacement: fileURLToPath(new URL("../fastify-http/src/$1", import.meta.url)) },
      { find: "@xtaskjs/security", replacement: fileURLToPath(new URL("../security/src/index.ts", import.meta.url)) },
      { find: /@xtaskjs\/security\/(.*)/, replacement: fileURLToPath(new URL("../security/src/$1", import.meta.url)) },
      { find: "@xtaskjs/mailer", replacement: fileURLToPath(new URL("../mailer/src/index.ts", import.meta.url)) },
      { find: /@xtaskjs\/mailer\/(.*)/, replacement: fileURLToPath(new URL("../mailer/src/$1", import.meta.url)) },
      { find: "@xtaskjs/internationalization", replacement: fileURLToPath(new URL("../internationalization/src/index.ts", import.meta.url)) },
      { find: /@xtaskjs\/internationalization\/(.*)/, replacement: fileURLToPath(new URL("../internationalization/src/$1", import.meta.url)) },
    ],
  },
});
