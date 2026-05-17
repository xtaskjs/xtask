import "reflect-metadata";
import assert from "assert";
import { Logger } from "@xtaskjs/common";
import { Module, Test } from "@xtaskjs/testing";
import { CheckoutController } from "./checkout.controller";

const mockLogger = {
  info: (_: string) => {},
  warn: (_: string) => {},
  error: (_: string) => {},
};

const mockIntl = {
  getCurrentLocale: () => "es-ES",
  listNamespaces: () => ["checkout"],
  t: (_key: string, _options?: any) => `translated:${_key}`,
  tAsync: async (_key: string, _options?: any) => `translated:${_key}`,
  loadNamespace: async (_ns: string) => {},
};

@Module({
  providers: [
    CheckoutController,
    { provide: Logger, useValue: mockLogger },
    { provide: "xtask:internationalization:service", useValue: mockIntl },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const controller = moduleRef.get(CheckoutController);

  // Test: checkout returns view with translated content
  const result = await controller.checkout("Carlos", "2", "249.50");
  assert.ok((result as any).__xtaskView === true, "Should return a view result");
  assert.strictEqual((result as any).template, "checkout");
  assert.ok(typeof (result as any).model.pageTitle === "string");
  assert.ok(typeof (result as any).model.totalText === "string");
  assert.strictEqual((result as any).model.locale, "es-ES");

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
