# xtaskjs Workspace

## Samples

- `01-new_app`: minimal `@xtaskjs/core` node-http application.
- `02-express_app`: Express adapter sample with static assets and file-backed views.
- `03-fastify_app`: Fastify adapter sample with views and static assets.
- `04-typeorm_app`: TypeORM integration sample.
- `06-security_app`: node-http security sample.
- `07-security_express_app`: Express security sample.
- `08-email_express_app`: Express mailer sample with file-backed email templates.
- `09-internationalization_app`: node-http internationalization sample with request-scoped locale resolution, custom formatters, and lazy namespaces.
- `10-internationalization_express_app`: Express internationalization sample with localized pages, views, and lazy checkout translations.
- `11-scheduler_app`: node-http scheduler sample with boot jobs, named groups, retries, and inspection endpoints.
- `16-queues_memory_app`: node-http queues sample using the in-memory transport, queue handlers, pattern listeners, and publish decorators.
- `17-queues_rabbitmq_app`: node-http queues sample using RabbitMQ, topic bindings, retries, and dead-letter handling.
- `18-value_objects_app`: node-http value objects sample with DTO hydration, normalization, JSON-backed properties, and DI-backed factories.
- `19-cqrs_app`: node-http CQRS sample with a write model, read projection, command/query buses, and separate SQLite read/write databases.
- `20-cqrs_postgres_replication_app`: node-http CQRS sample with PostgreSQL master/slave replication in Docker, master-only writes, and slave-only reads.
- `21-event_source_rabbitmq_app`: node-http event-source sample with a TypeORM-backed SQLite event store, replayed aggregates, projection updates, and RabbitMQ delivery.
- `22-event_source_cqrs_app`: node-http interoperability sample where event-source owns writes and CQRS builds the read model from persisted domain events.
- `23-socket_io_express_app`: Express + Socket.IO sample with decorated gateways, room joins, acknowledgements, and HTTP-triggered broadcasts.
- `25-testing_app`: in-memory testing runtime sample showing module graph creation, DI overrides/mocking, lifecycle hooks, and isolated test containers with `@xtaskjs/testing`.
- `26-bots_app`: unified bots sample with Telegram, Slack, and WhatsApp adapters in a single `@xtaskjs/bots` runtime.
- `27-bots_webhook_security_app`: unified bots webhook sample for Slack/Telegram with HMAC signature validation and JWT-protected audit routes via `@xtaskjs/security`.
- `28-mcp_server_app`: MCP server sample exposing `@xtaskjs/mcp` decorators over stdio and Streamable HTTP transports.
- `29-mcp_auth_http_app`: MCP HTTP sample with Bearer/OAuth authentication over `/mcp` using the official SDK adapter.

## Workspace Packages

- `@xtaskjs/common`: shared decorators, metadata, logging, and cross-cutting primitives.
- `@xtaskjs/core`: DI container, lifecycle, kernel, scanner, and app bootstrap runtime.
- `@xtaskjs/config`: schema-driven configuration loading and environment validation.
- `@xtaskjs/value-objects`: value object helpers, converters, factories, and decorators.
- `@xtaskjs/validation`: request validation integration and validation pipe helpers.
- `@xtaskjs/express-http`: Express HTTP adapter integration.
- `@xtaskjs/fastify-http`: Fastify HTTP adapter integration.
- `@xtaskjs/typeorm`: TypeORM module integration and lifecycle wiring.
- `@xtaskjs/security`: JWT/JWE security strategies, guards, and auth helpers.
- `@xtaskjs/mailer`: mail transports, template renderers, and email dispatch helpers.
- `@xtaskjs/cache`: in-memory/redis cache services and HTTP cache helpers.
- `@xtaskjs/scheduler`: cron/interval/timeout scheduling runtime and lifecycle hooks.
- `@xtaskjs/queues`: queues abstraction and broker transports (memory/RabbitMQ).
- `@xtaskjs/socket-io`: Socket.IO gateway integration and broadcast helpers.
- `@xtaskjs/internationalization`: locale resolution, translation, formatters, and namespaces.
- `@xtaskjs/throttler`: throttling decorators, guards, stores, and lifecycle support.
- `@xtaskjs/testing`: testing runtime, module builder, and DI override utilities.
- `@xtaskjs/cqrs`: command/query buses, handlers, repositories, and projection support.
- `@xtaskjs/event-source`: event-sourcing runtime with aggregate/event-store integration.
- `@xtaskjs/mcp`: decorator-based MCP server builder with lifecycle integration.
- `@xtaskjs/bots`: multi-platform bots runtime for Telegram, Slack, and WhatsApp adapters.

## Follow The Latest Bots Samples

Recommended order:

1. `samples/26-bots_app`
2. `samples/27-bots_webhook_security_app`

Quick commands:

```bash
cd samples/26-bots_app && pnpm install && pnpm test && pnpm start
```

Then in a new terminal:

```bash
cd samples/27-bots_webhook_security_app && pnpm install && pnpm test && pnpm start
```

With the webhook sample running, trigger signed test calls:

```bash
cd samples/27-bots_webhook_security_app && pnpm run curl:webhooks
```

## Release helpers

Use the root scripts to pack or publish workspace packages in dependency order:

```bash
pnpm run release:order
pnpm run version:packages -- patch
pnpm run pack:packages
pnpm run publish:packages
pnpm run publish:packages:patch
pnpm run publish:packages -- --bump patch
```

Use `pnpm run publish:packages:patch` when you want a one-step release that bumps versions and publishes in order.

Additional npm arguments can be passed through with `--`:

```bash
pnpm run pack:packages -- --dry-run
pnpm run publish:packages -- --tag next
```

## Release auth

Publishing to npm for the `@xtaskjs` scope requires credentials that satisfy npm's 2FA policy.

The publish helper now runs a preflight auth check before starting the batch and will stop early if npm auth is missing or no publish token is configured.

- Prefer a granular access token with publish permissions for the scope and 2FA bypass enabled.
- Export the token before publishing so `npm publish` can use it from each package directory.
- For CI releases, prefer npm trusted publishing instead of a long-lived local token.

Example local setup:

```bash
export NPM_TOKEN=your_token_here
pnpm whoami
pnpm run publish:packages
```

## Startup import concurrency

The core autoload scanner imports discovered files using a bounded async pool.

You can tune startup behavior with `XTASK_IMPORT_CONCURRENCY`:

- Small apps (up to ~30 files): `6-10`
- Medium apps (~30-120 files): `10-16`
- Large apps (120+ files): `16-24`

Default is `10` (and never higher than the amount of discovered files).

```bash
XTASK_IMPORT_CONCURRENCY=16 pnpm start
```

In constrained environments (CI/small containers), avoid very high values to prevent filesystem saturation.
