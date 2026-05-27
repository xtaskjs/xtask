import { defineConfig } from "vitest/config";
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
    include: ["src/**/*.spec.ts"],
    passWithNoTests: true,
  },
});
