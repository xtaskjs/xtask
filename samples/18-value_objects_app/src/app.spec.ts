import "reflect-metadata";
import assert from "assert";
import { Logger } from "@xtaskjs/common";
import { Module, Test } from "@xtaskjs/testing";
import {
  BudgetAmount,
  CustomerIdFactory,
  CustomerPreferences,
  DisplayName,
  EmailAddress,
  ValueObjectsDemoService,
} from "./value-objects-demo.service";

const mockLogger = {
  info: (_: string) => {},
  warn: (_: string) => {},
  error: (_: string) => {},
};

@Module({
  providers: [
    ValueObjectsDemoService,
    CustomerIdFactory,
    { provide: Logger, useValue: mockLogger },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule).compile();

  const demoService = moduleRef.get(ValueObjectsDemoService);

  // Test: describeExamples returns normalized email and examples
  const examples = demoService.describeExamples();
  assert.strictEqual(examples.normalizedEmail, "user@example.com");
  assert.strictEqual(examples.emailEquality, true);
  assert.ok(typeof examples.budget.value === "number");
  assert.ok(typeof examples.budget.formatted === "string");

  // Test: createCustomer stores and returns customer with value objects
  const customer = demoService.createCustomer({
    email: new EmailAddress("alice@example.com"),
    displayName: new DisplayName("Alice Smith"),
    budget: new BudgetAmount(500.0),
    preferences: new CustomerPreferences({ locale: "en-US", marketing: false }),
  });
  assert.strictEqual(customer.email, "alice@example.com");
  assert.strictEqual(customer.displayName, "Alice Smith");
  assert.ok(typeof customer.id === "string");
  assert.strictEqual(customer.duplicateEmailCheck, true);

  // Test: listCustomers returns the stored customer
  const list = demoService.listCustomers();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].email, "alice@example.com");

  // Test: findCustomer by id
  const found = demoService.findCustomer(customer.id);
  assert.strictEqual(found.found, true);

  // Test: findCustomer with unknown id
  const missing = demoService.findCustomer("999999999");
  assert.strictEqual(missing.found, false);

  await moduleRef.close();
  console.log("All tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
