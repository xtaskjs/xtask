# 22-event_source_cqrs_app

Node HTTP sample application where `@xtaskjs/event-source` owns aggregate writes and stream persistence, while `@xtaskjs/cqrs` owns projections and queries on a separate read database.

## Run

```bash
npm install
npm start
```

From this folder: `samples/22-event_source_cqrs_app`.

## Environment

- `EVENT_SOURCE_DB_PATH`: defaults to `xtask-event-source-cqrs-write.sqlite`
- `READ_DB_PATH`: defaults to `xtask-event-source-cqrs-read.sqlite`
- `EVENT_STORE_TABLE`: defaults to `interop_event_store`
- `PORT`: defaults to `3000`

## Test URLs

- Health endpoint:
  - http://127.0.0.1:3000/health
- Sample overview:
  - http://127.0.0.1:3000/interop
- CQRS projection list:
  - http://127.0.0.1:3000/interop/users
- Runtime state:
  - http://127.0.0.1:3000/interop/state
- Inspect one aggregate stream:
  - http://127.0.0.1:3000/interop/streams/<userId>
- Create a user through event-source:
  - `POST http://127.0.0.1:3000/interop/users`
- Verify a user's email through event-source:
  - `POST http://127.0.0.1:3000/interop/users/<userId>/verify-email`

Example request body for `POST /interop/users`:

```json
{
  "displayName": "Ada Lovelace",
  "email": "ada@example.com"
}
```

## What It Demonstrates

- `@EventSourcedAggregate()` and `@ApplyEvent()` for write-side aggregate behavior.
- `createTypeOrmEventStore()` storing the event stream in the write database.
- An `@EventSourceSubscriber()` bridge that republishes stored domain events into the CQRS `EventBus`.
- `@EventHandler()` classes that build and update a separate CQRS read model.
- `QueryBus`-driven reads over the projection database.

## Boundary Notes

- Event-source is the system of record for domain changes.
- CQRS is used only for projections and queries in this sample.
- There is no CQRS command handler on the write side here, which keeps the responsibilities separate.

## Notes

- The event-store table is created automatically in the write database.
- The bridge subscriber forwards only persisted domain events, not speculative aggregate state.
- Set `EVENT_SOURCE_DB_PATH` or `READ_DB_PATH` to override the default SQLite file locations.
## Manifest Cache

- On first startup, xtaskjs performs a filesystem scan and creates `.xtask-manifest.json`.
- On subsequent startups, xtaskjs loads this manifest directly to speed up boot time.
- Delete `.xtask-manifest.json` to force a full rescan.
- This file is ignored in `.gitignore` for each sample.
## Parallel Load Configuration

- xtaskjs scans autoload candidates in parallel using worker threads.
- By default, it uses all available CPU parallelism.
- Use `npm run start:parallel` in this sample to run with explicit parallel configuration (`XTASK_SCAN_WORKERS=auto`).
- Optional: set `XTASK_SCAN_WORKERS=1` to force single-worker mode for debugging.
