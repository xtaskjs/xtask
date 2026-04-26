# 24-throttler_app

Node HTTP sample application using `@xtaskjs/throttler` with xtaskjs lifecycle integration.

## Run

```bash
npm install
npm start
```

From this folder: `samples/24-throttler_app`.

## Test URLs

- Health (not throttled):
  - http://127.0.0.1:3000/health
- Public endpoint (no throttle):
  - http://127.0.0.1:3000/api/public
- Default throttle – 5 req / 10 s per IP:
  - http://127.0.0.1:3000/api/data
- Strict throttle – 2 req / 10 s per IP:
  - http://127.0.0.1:3000/api/strict
- Per-user throttle – 3 req / 10 s per `?user=` value:
  - http://127.0.0.1:3000/api/admin?user=alice
- Reset the caller's limit (useful while testing):
  - http://127.0.0.1:3000/api/reset-limit

## What It Demonstrates

- Global rate-limit configuration via `configureThrottler()`.
- `@Throttle(limit, ttl)` on individual route methods.
- Custom `keyGenerator` to throttle by a query parameter instead of IP.
- Injecting `ThrottlerService` via `@InjectThrottlerService()` to call `reset()` programmatically.
- HTTP 429 responses with `limit`, `ttlMs`, and `resetAt` details in the response body.

## Notes

- Uses the default `node-http` adapter and the built-in in-memory store.
- Hit an endpoint more times than the limit within the TTL window to see a 429 response.
- Call `/api/reset-limit` to clear your IP's counter and start again.
- For Redis-backed throttling, set `driver: "redis"` and add connection options in `configureThrottler()`.
