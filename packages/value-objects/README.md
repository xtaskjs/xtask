# @xtaskjs/value-objects

Value object primitives, converters, and XTaskJS integration helpers.

This package is part of the xtaskjs project, hosted at [xtaskjs.io](https://xtaskjs.io).

## Installation
```bash
npm install @xtaskjs/value-objects reflect-metadata
```

Install `class-transformer` when you want DTO property decorators.

```bash
npm install class-transformer
```

## What It Provides
- Base classes for string, number, boolean, bigint, date, and JSON-backed value objects.
- Conversion helpers to move between raw values, JSON strings, and serialized payloads.
- `class-transformer` integration for DTO fields.
- XTaskJS factory helpers so value objects can be created through the DI container.

## Define A Value Object
```typescript
import { StringValueObject } from "@xtaskjs/value-objects";

export class EmailAddress extends StringValueObject {
  constructor(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized.includes("@")) {
      throw new Error("Invalid email address");
    }
    super(normalized);
  }
}

const email = EmailAddress.fromJSON('"USER@Example.com"');

email.toString();
email.toJSON();
email.toPlain();
```

## Use In DTOs
```typescript
import { plainToInstance } from "class-transformer";
import { TransformValueObject } from "@xtaskjs/value-objects";

class CreateUserDto {
  @TransformValueObject(EmailAddress)
  email!: EmailAddress;
}

const dto = plainToInstance(CreateUserDto, {
  email: "USER@Example.com",
});
```

When the incoming payload is a JSON string instead of a plain primitive, set `source: "json"`.

```typescript
import { JsonValueObject, TransformValueObject } from "@xtaskjs/value-objects";

class Preferences extends JsonValueObject<{ locale: string }> {}

class UpdatePreferencesDto {
  @TransformValueObject(Preferences, { source: "json" })
  preferences!: Preferences;
}
```

## Register A DI Factory
```typescript
import { InjectableValueObjectFactory, ValueObjectFactoryFor } from "@xtaskjs/value-objects";

@ValueObjectFactoryFor(EmailAddress)
export class EmailAddressFactory extends InjectableValueObjectFactory<EmailAddress> {}
```

That factory is registered as an XTaskJS service and can be resolved from the container like any other singleton service.

## Resources
- Website: [xtaskjs.io](https://xtaskjs.io)
- Package: [@xtaskjs/value-objects](https://www.npmjs.com/package/@xtaskjs/value-objects)
- Source: [xtaskjs/xtask](https://github.com/xtaskjs/xtask)