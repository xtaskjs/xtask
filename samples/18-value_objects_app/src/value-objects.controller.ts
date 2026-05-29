import { Body, Controller, Get, Param, Post } from "@xtaskjs/common";
import { SchemaDto } from "@xtaskjs/validation";
import { TransformValueObject } from "@xtaskjs/value-objects";
import { z } from "zod";
import {
  BudgetAmount,
  CreateCustomerInput,
  CustomerPreferences,
  DisplayName,
  EmailAddress,
  ValueObjectsDemoService,
} from "./value-objects-demo.service";

@SchemaDto(
  z.object({
    email: z.unknown(),
    displayName: z.unknown(),
    budget: z.unknown(),
    preferences: z.unknown(),
  })
)
class CreateCustomerRequest implements CreateCustomerInput {
  @TransformValueObject(EmailAddress)
  email!: EmailAddress;

  @TransformValueObject(DisplayName)
  displayName!: DisplayName;

  @TransformValueObject(BudgetAmount)
  budget!: BudgetAmount;

  @TransformValueObject(CustomerPreferences, { source: "json" })
  preferences!: CustomerPreferences;
}

@Controller("/value-objects")
export class ValueObjectsController {
  constructor(private readonly demo: ValueObjectsDemoService) {}

  @Get("/")
  describe() {
    return {
      sample: "18-value_objects_app",
      endpoints: [
        "GET /value-objects/examples",
        "GET /value-objects/customers",
        "GET /value-objects/customers/:id",
        "POST /value-objects/customers",
      ],
      requestExample: {
        email: " USER@Example.com ",
        displayName: "  Ada   Lovelace ",
        budget: "249.995",
        preferences: '{"locale":"es","marketing":true}',
      },
    };
  }

  @Get("/examples")
  examples() {
    return this.demo.describeExamples();
  }

  @Get("/customers")
  listCustomers() {
    return this.demo.listCustomers();
  }

  @Get("/customers/:id")
  getCustomer(@Param("id") id: string) {
    return this.demo.findCustomer(id);
  }

  @Post("/customers")
  createCustomer(@Body() body: CreateCustomerRequest) {
    return this.demo.createCustomer(body);
  }
}