# 18-value_objects_app

Node HTTP sample application using `@xtaskjs/value-objects` for normalized domain primitives, DTO hydration, and DI-backed factories.

## Run

```bash
npm install
npm start
```

From this folder: `samples/18-value_objects_app`.

## Test URLs

- Health endpoint:
  - http://127.0.0.1:3000/health
- Sample overview:
  - http://127.0.0.1:3000/value-objects
- Value object examples:
  - http://127.0.0.1:3000/value-objects/examples
- Create an in-memory customer record:
  - `POST http://127.0.0.1:3000/value-objects/customers`
- List created customers:
  - http://127.0.0.1:3000/value-objects/customers

Example request body for `POST /value-objects/customers`:

```json
{
  "email": " USER@Example.com ",
  "displayName": "  Ada   Lovelace ",
  "budget": "249.995",
  "preferences": "{\"locale\":\"es\",\"marketing\":true}"
}
```

## What It Demonstrates

- Custom string, number, bigint, date, and JSON-backed value objects.
- `TransformValueObject()` converting request payload fields into rich value object instances.
- `ValueObjectFactoryFor()` and `InjectableValueObjectFactory` for DI-friendly identifier creation.
- Consistent serialization through `toJSON()`, `toPlain()`, and value object equality checks.

## Notes

- The sample keeps created customers in memory only.
- The `preferences` field is intentionally submitted as a JSON string so you can see `source: "json"` DTO hydration in action.