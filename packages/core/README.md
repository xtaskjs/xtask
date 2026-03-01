# @xtaskjs/core

Core package for xtaskjs, a modern, fast Node.js web framework.

## Installation
```bash
npm install @xtaskjs/core
```

## Usage
```typescript
import { ... } from '@xtaskjs/core';
```

## HTTP Platform Adapters
`@xtaskjs/core` now supports an adapter layer similar to NestJS. You can switch servers without changing controller code.

```typescript
import { CreateApplication } from "@xtaskjs/core";

async function main() {
	const app = await CreateApplication({
		adapter: "node-http", // "express" | "fastify"
		autoListen: true,
		server: { host: "127.0.0.1", port: 3000 },
	});
}
```

With `express` or `fastify`, pass your instance in `adapterInstance`:

```typescript
const app = await CreateApplication({
	adapter: "express",
	adapterInstance: express(),
});
```

For Express support, install the adapter package:

```bash
npm install @xtaskjs/express-http
```

## Features
- Dependency Injection
- Application Lifecycle
- Kernel and Server utilities

## Controller Route Integration
- `Container.registerLifeCycleListeners(app)` now registers lifecycle handlers/runners and controller routes.
- `ApplicationLifeCycle.registerControllerRoute(...)` stores resolved routes.
- `ApplicationLifeCycle.dispatchControllerRoute(method, path, ...args)` executes guards, pipes, middlewares, and the route handler.

## Metrics Log Configuration
- Metrics logs are disabled by default.
- Set `XTASKJS_SHOW_METRICS_LOGS=true` to show runtime metric logs like `[Metrics] Heap MB` and `CPU { ... }`.

## Startup Benchmark
- Run `npm run benchmark:startup --prefix packages/core` from the workspace root.
- Optional env vars:
	- `XTASKJS_BENCH_WARMUP` (default: `3`)
	- `XTASKJS_BENCH_ITERATIONS` (default: `10`)
	- `XTASKJS_BENCH_NODE_ENV` (default: `test`)
- Example:
	- `XTASKJS_BENCH_WARMUP=5 XTASKJS_BENCH_ITERATIONS=20 XTASKJS_BENCH_NODE_ENV=production npm run benchmark:startup --prefix packages/core`

## Documentation
See [xtaskjs.com](https://xtaskjs.com) for full documentation.
