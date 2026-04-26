# Changelog

## [1.0.0] - 2026-04-26

### Added
- Initial release.
- `MemoryThrottleStore` — in-memory sliding-window counter store.
- `RedisThrottleStore` — Redis-backed store using an atomic Lua script.
- `ThrottlerService` — performs the rate-limit check and exposes `reset()`.
- `ThrottlerLifecycleManager` — initializes the store, registers DI bindings, and tears down on app close.
- `@Throttle(limit, ttl, options?)` — method and class decorator.
- `throttlerGuard` — guard that enforces the throttle metadata and throws HTTP 429 on breach.
- `configureThrottler()` — global configuration helper (limit, ttl, driver, keyGenerator, skipIf, errorMessage, redis).
- Automatic integration with the xtaskjs core lifecycle via `initializeThrottlerIntegration` / `shutdownThrottlerIntegration`.
- Default IP-based key resolution via `X-Forwarded-For`, `request.ip`, and `socket.remoteAddress`.
