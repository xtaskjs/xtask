# 19-cqrs_app

Node HTTP sample application using `@xtaskjs/cqrs` and `@xtaskjs/typeorm` with separate SQLite databases for writes and reads.

## Run

```bash
npm install
npm start
```

From this folder: `samples/19-cqrs_app`.

## Test URLs

- Health endpoint:
  - http://127.0.0.1:3000/health
- Sample overview:
  - http://127.0.0.1:3000/cqrs
- Read model list:
  - http://127.0.0.1:3000/cqrs/users
- CQRS runtime state:
  - http://127.0.0.1:3000/cqrs/debug/state
- Rebuild all read projections:
  - `POST http://127.0.0.1:3000/cqrs/projections/rebuild`
- Create a user through the command bus:
  - `POST http://127.0.0.1:3000/cqrs/users`

Example request body for `POST /cqrs/users`:

```json
{
  "displayName": "Ada Lovelace",
  "email": "ada@example.com",
  "requestId": "signup-ada-001"
}
```

## What It Demonstrates

- A write model persisted in `xtask-cqrs-write.sqlite`.
- A read projection persisted independently in `xtask-cqrs-read.sqlite`.
- Command dispatch with `CommandBus` and query dispatch with `QueryBus`.
- Automatic command idempotency using `requestId`.
- An event-driven projection handler that updates the read side when the write side changes.
- A process manager that reacts to `UserCreatedEvent` and marks the projection as onboarded.
- Projection rebuild tooling that reconstructs the read model from the write-side data.
- Separate repository injection through `@InjectWriteRepository()` and `@InjectReadRepository()`.

## Notes

- The command handler writes to the write database and publishes a `UserCreatedEvent`.
- The projection handler listens for that event and stores a denormalized record in the read database.
- The process manager dispatches a follow-up command so the projection status changes from `ready` to `onboarded`.
- Repeating the same `requestId` returns the cached command result instead of creating a duplicate write-side row.
- Set `WRITE_DB_PATH` or `READ_DB_PATH` to override the default SQLite file locations.