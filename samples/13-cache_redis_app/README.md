# 13-cache_redis_app

Node HTTP sample application using `@xtaskjs/cache` with Redis-backed storage and Docker Compose.

## Run Locally

Start Redis first.

```bash
docker compose up redis -d
```

Then install and run the app from this folder: `samples/13-cache_redis_app`.

```bash
npm install
REDIS_URL=redis://127.0.0.1:6379 npm start
```

## Run With Docker Compose

From this folder: `samples/13-cache_redis_app`.

```bash
docker compose up --build
```

That starts:

- The sample app on `http://127.0.0.1:3000`
- Redis on `redis://127.0.0.1:6379`

## Test URLs

- Health endpoint:
  - http://127.0.0.1:3000/health
- Read a Redis-cached product:
  - http://127.0.0.1:3000/cache/products/42
- Inspect a single cached entry:
  - http://127.0.0.1:3000/cache/products/42/inspect
- Force a refresh and overwrite the Redis entry:
  - http://127.0.0.1:3000/cache/products/42/refresh
- Evict a Redis key:
  - http://127.0.0.1:3000/cache/products/42/evict
- See cache state and active keys:
  - http://127.0.0.1:3000/cache/state
- Runtime cache management endpoints:
  - http://127.0.0.1:3000/ops/cache/models
  - http://127.0.0.1:3000/ops/cache/models/products
  - http://127.0.0.1:3000/ops/cache/models/products/entries/42

## What It Demonstrates

- `configureCache()` with Redis connection settings.
- A `@CacheModel()` bound to the Redis store.
- Read-through caching through `@Cacheable()`.
- Forced writes through `@CachePut()`.
- Explicit eviction through `@CacheEvict()`.
- Runtime inspection through `createCacheManagementController()`.
- A Docker Compose setup with an app service and a Redis service.

## Notes

- The sample uses `connectOnStart: true`, so app startup fails fast if Redis is unavailable.
- Repeating `GET /cache/products/42` returns the same cached payload until you call `refresh` or `evict`.
- The `cache/state` route shows the active store kind, configured model, and the keys currently stored in Redis.
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
