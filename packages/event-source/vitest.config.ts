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
  },
  resolve: {
    alias: [
      { find: "@xtaskjs/common", replacement: fileURLToPath(new URL("../common/src/index.ts", import.meta.url)) },
      { find: /@xtaskjs\/common\/(.*)/, replacement: fileURLToPath(new URL("../common/src/$1", import.meta.url)) },
      { find: "@xtaskjs/core", replacement: fileURLToPath(new URL("../core/src/index.ts", import.meta.url)) },
      { find: /@xtaskjs\/core\/(.*)/, replacement: fileURLToPath(new URL("../core/src/$1", import.meta.url)) },
      { find: "@xtaskjs/typeorm", replacement: fileURLToPath(new URL("../typeorm/src/index.ts", import.meta.url)) },
      { find: /@xtaskjs\/typeorm\/(.*)/, replacement: fileURLToPath(new URL("../typeorm/src/$1", import.meta.url)) },
      { find: "@xtaskjs/queues", replacement: fileURLToPath(new URL("../queues/src/index.ts", import.meta.url)) },
      { find: /@xtaskjs\/queues\/(.*)/, replacement: fileURLToPath(new URL("../queues/src/$1", import.meta.url)) }
    ],
  },
});
