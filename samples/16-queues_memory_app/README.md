# 16-queues_memory_app

Node HTTP sample application using `@xtaskjs/queues` with an explicit in-memory transport.

## Run

```bash
npm install
npm start
```

From this folder: `samples/16-queues_memory_app`.

## Test URLs

- Health endpoint:
  - http://127.0.0.1:3000/health
- Sample overview:
  - http://127.0.0.1:3000/queues
- Queue runtime state:
  - http://127.0.0.1:3000/queues/status
- Publish an `orders.created` message:
  - `POST http://127.0.0.1:3000/queues/orders`
- Publish an `orders.completed` message through the decorator:
  - `POST http://127.0.0.1:3000/queues/orders/42/complete`

Example request body for `POST /queues/orders`:

```json
{
  "orderId": "42",
  "customerId": "customer-7",
  "priority": "high"
}
```

## What It Demonstrates

- `configureQueues()` with an explicit `memory` transport name.
- `registerInMemoryQueueTransport()` for local queue processing with no external broker.
- `QueueHandler()` and `QueuePattern()` consumers running inside the xtaskjs lifecycle.
- `InjectQueueService()` for publishing application messages.
- `PublishToQueue()` for emitting follow-up events from a service method.

## Notes

- All messages stay inside process memory. Restarting the app clears queued state and event history.
- The `orders.created` consumer republishes a local notification message so you can see handler-to-handler workflows in the status output.
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
