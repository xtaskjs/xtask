# 21-event_source_rabbitmq_app

Node HTTP sample application using `@xtaskjs/event-source` with a TypeORM-backed event store and RabbitMQ-backed event delivery through `@xtaskjs/queues`.

## Run

```bash
npm install
npm run rabbitmq:up
npm start
```

From this folder: `samples/21-event_source_rabbitmq_app`.

RabbitMQ management UI:

- http://127.0.0.1:15672
- username: `guest`
- password: `guest`

## Environment

- `EVENT_SOURCE_DB_PATH`: defaults to `xtask-event-source.sqlite`
- `EVENT_STORE_TABLE`: defaults to `user_event_store`
- `AMQP_URL`: defaults to `amqp://guest:guest@127.0.0.1:5672`
- `AMQP_EXCHANGE`: defaults to `xtask.samples.event-source`
- `AMQP_DLX`: defaults to `<exchange>.dlx`
- `PORT`: defaults to `3000`

## Test URLs

- Health endpoint:
  - http://127.0.0.1:3000/health
- Sample overview:
  - http://127.0.0.1:3000/event-source
- Projection list:
  - http://127.0.0.1:3000/event-source/users
- Queue and projection runtime state:
  - http://127.0.0.1:3000/event-source/status
- Stream inspection for a single user:
  - http://127.0.0.1:3000/event-source/streams/<userId>
- Register a user aggregate:
  - `POST http://127.0.0.1:3000/event-source/users`
- Raise a follow-up event on the same aggregate:
  - `POST http://127.0.0.1:3000/event-source/users/<userId>/verify-email`

Example request body for `POST /event-source/users`:

```json
{
  "displayName": "Ada Lovelace",
  "email": "ada@example.com"
}
```

## What It Demonstrates

- `@EventSourcedAggregate()` and `@ApplyEvent()` for aggregate rehydration.
- `createTypeOrmEventStore()` storing event streams in SQLite through `@xtaskjs/typeorm`.
- `createQueueEventPublisher()` forwarding stored events to RabbitMQ through `@xtaskjs/queues`.
- In-process `@EventSourceSubscriber()` projection updates backed by a normal TypeORM repository.
- Broker-backed consumption of `domain.users.*` events through `QueuePattern()`.
- Aggregate inspection through replayed stream history instead of mutable write-side rows.

## Notes

- The aggregate writes only events. The `user_projections` table is maintained by an event-source subscriber.
- The event-store table is created automatically by the TypeORM event-store adapter.
- RabbitMQ delivery is additive here: the source of truth remains the stored event stream in SQLite.
- Stop RabbitMQ with `npm run rabbitmq:down` when you are finished.
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
