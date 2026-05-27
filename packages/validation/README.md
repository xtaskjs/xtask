# @xtaskjs/validation

Modern schema validation for xtaskjs using Zod or Valibot.

This package integrates schema-first validation into the xtaskjs controller pipeline and dependency injection ecosystem.

## Installation

```bash
npm install @xtaskjs/validation reflect-metadata zod
```

Or with Valibot:

```bash
npm install @xtaskjs/validation reflect-metadata valibot
```

## Quick Start

```typescript
import "reflect-metadata";
import { Controller, Post } from "@xtaskjs/common";
import { CreateApplication } from "@xtaskjs/core";
import { ValidatedBody } from "@xtaskjs/validation";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  age: z.coerce.number().int().min(18),
});

@Controller("users")
class UsersController {
  @Post("/")
  create(@ValidatedBody(createUserSchema) body: z.infer<typeof createUserSchema>) {
    return body;
  }
}

await CreateApplication();
```

When `@xtaskjs/validation` is installed, `@xtaskjs/core` uses its schema validation pipe as the default global HTTP validation layer.

## API

- `ValidatedBody(schema, property?)`, `ValidatedQuery(schema, property?)`, `ValidatedParam(schema, property?)`: bind and validate request arguments.
- `SchemaDto(schema)`: attach a schema to a class-based DTO used with `@Body()`, `@Query()`, or `@Param()`.
- `UseBodySchema(schema)`, `UseQuerySchema(schema)`, `UseParamSchema(schema)`: declare handler- or controller-level schemas.
- `zodSchema(schema)`, `valibotSchema(schema)`: wrap schemas explicitly when you want to avoid adapter auto-detection.
- `configureValidation(options)`: set the default adapter or provide a custom adapter.
- `initializeValidationIntegration(container, lifecycle?)`: register validation services inside the xtaskjs container.

## Resources

- Project site and documentation: [xtaskjs.io](https://xtaskjs.io)
- npm package: [@xtaskjs/validation](https://www.npmjs.com/package/@xtaskjs/validation)
- Source repository: [xtaskjs/xtaskjs](https://github.com/xtaskjs/xtaskjs)