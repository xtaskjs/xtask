# 12-cache_app

Node HTTP sample application using `@xtaskjs/cache` with the local in-memory driver.

## Run

```bash
npm install
npm start
```

From this folder: `samples/12-cache_app`.

## Test URLs

- Health endpoint:
  - http://127.0.0.1:3000/health
- Read-through cached product:
  - http://127.0.0.1:3000/cache/products/42
- Inspect whether a key exists in the local cache:
  - http://127.0.0.1:3000/cache/products/42/inspect
- Force a refresh and overwrite the cached entry:
  - http://127.0.0.1:3000/cache/products/42/refresh
- Evict a cached key:
  - http://127.0.0.1:3000/cache/products/42/evict
- See cache state and registered models:
  - http://127.0.0.1:3000/cache/state
- Runtime cache management endpoints:
  - http://127.0.0.1:3000/ops/cache/models
  - http://127.0.0.1:3000/ops/cache/models/products

## What It Demonstrates

- `configureCache()` with the local memory driver.
- A `@CacheModel()` with a per-model TTL.
- Read-through caching through `@Cacheable()`.
- Forced writes through `@CachePut()`.
- Explicit eviction through `@CacheEvict()`.
- Optional operational endpoints created with `createCacheManagementController()`.

## Notes

- Cache storage is local memory only. Restarting the process clears all keys.
- Repeating `GET /cache/products/42` returns the same payload until you call `refresh` or `evict`.
## Manifest Cache

- On first startup, xtaskjs performs a filesystem scan and creates `.xtask-manifest.json`.
- On subsequent startups, xtaskjs loads this manifest directly to speed up boot time.
- Delete `.xtask-manifest.json` to force a full rescan.
- This file is ignored in `.gitignore` for each sample.
