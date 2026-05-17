import "reflect-metadata";
import assert from "assert";
import { Logger } from "@xtaskjs/common";
import { Module, Test } from "@xtaskjs/testing";
import { InternationalizationController } from "./i18n.controller";

const mockLogger = {
  info: (_: string) => {},
  warn: (_: string) => {},
  error: (_: string) => {},
};

const mockIntl = {
  getCurrentLocale: () => "en-US",
  listNamespaces: () => ["landing"],
  t: (_key: string, _options?: any) => `translated:${_key}`,
  tAsync: async (_key: string, _options?: any) => `translated:${_key}`,
  loadNamespace: async (_ns: string) => {},
};

@Module({
  providers: [
    InternationalizationController,
    { provide: Logger, useValue: mockLogger },
    { provide: "xtask:internationalization:service", useValue: mockIntl },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const controller = moduleRef.get(InternationalizationController);

  // Test: overview returns locale and translated messages
  const overview = controller.overview("Alice", "3", "1499.95");
  assert.strictEqual(overview.locale, "en-US");
  assert.deepStrictEqual(overview.namespaces, ["landing"]);
  assert.ok(typeof overview.messages.title === "string");
  assert.ok(typeof overview.messages.summary === "string");

  // Test: checkout loads namespace and returns translated content
  const checkout = await controller.checkout("Bob", "5", "299.99");
  assert.strictEqual(checkout.locale, "en-US");
  assert.ok(typeof checkout.checkout.headline === "string");
  assert.ok(typeof checkout.checkout.total === "string");

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
