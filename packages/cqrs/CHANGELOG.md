# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 1.1.3 (2026-04-06)

**Note:** Version bump only for package @xtaskjs/cqrs





# Changelog

## 1.0.0
- Initial CQRS package with command, query, and event buses.
- Read/write datasource aliases backed by `@xtaskjs/typeorm`.
- xtaskjs container and lifecycle integration.

## 1.1.0
- Added `@ProcessManager()` and `Saga` support for event-driven orchestration.
- Added `@IdempotentCommand()` and an in-memory idempotency store.
- Added projection rebuilder registration and lifecycle rebuild APIs.
