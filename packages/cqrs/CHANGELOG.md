# Changelog

## 1.0.0
- Initial CQRS package with command, query, and event buses.
- Read/write datasource aliases backed by `@xtaskjs/typeorm`.
- xtaskjs container and lifecycle integration.

## 1.1.0
- Added `@ProcessManager()` and `Saga` support for event-driven orchestration.
- Added `@IdempotentCommand()` and an in-memory idempotency store.
- Added projection rebuilder registration and lifecycle rebuild APIs.