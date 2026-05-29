# @xtaskjs/core

Core package for xtaskjs, a modern, fast Node.js web framework.

This package is part of the xtaskjs project, hosted at [xtaskjs.io](https://xtaskjs.io).

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
		logger: {
			appName: "xTaskjs",
			useColors: true,
			file: {
				enabled: true,
				path: "./logs/app.log",
			},
		},
	});
}
```

`logger` is applied globally through the container, and each injected `Logger` automatically receives the class name as context.

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

For Fastify support, install the adapter package:

```bash
npm install @xtaskjs/fastify-http
```

## Request Validation

`CreateApplication()` now enables a global validation pipe by default. Controllers can bind DTOs directly from the request using the decorators exported by `@xtaskjs/common`:

```typescript
import { Body, Controller, Param, Post } from "@xtaskjs/common";
import { IsString } from "class-validator";

class CreateUserDto {
	@IsString()
	name!: string;
}

@Controller("users")
class UsersController {
	@Post("/:id")
	create(@Param("id") id: string, @Body() body: CreateUserDto) {
		return { id, body };
	}
}
```

Install the validator dependencies in the app workspace:

```bash
npm install class-transformer class-validator
```

## Template Engines

Controllers can return rendered views with `view(...)`:

```typescript
import { view } from "@xtaskjs/core";

return view("home", { title: "Hello" });
```

The selected adapter must implement view rendering (for example `@xtaskjs/express-http` via `templateEngine`).

## Features
- Dependency Injection
- Application Lifecycle
- Kernel and Server utilities

## Controller Route Integration
- `Container.registerLifeCycleListeners(app)` now registers lifecycle handlers/runners and controller routes.
- `ApplicationLifeCycle.registerControllerRoute(...)` stores resolved routes.
- `ApplicationLifeCycle.dispatchControllerRoute(method, path, ...args)` executes guards, pipes, middlewares, and the route handler.

## DI Lazy Resolution
- Constructor dependencies are now injected as transparent lazy proxies.
- A dependency instance is created only on first real access (property read, method call, etc.).
- Singleton and transient scopes are preserved after lazy resolution.
- Controller instances are still resolved during lifecycle registration so routes are available at startup.

This improves startup time when your graph includes integrations that are not used on every execution path (for example scheduler, mailer, or queue services).

```typescript
import { CreateApplication } from "@xtaskjs/core";

// Startup: controllers are registered so routes are available immediately.
await CreateApplication({
	container: {
		resolutionStrategy: "lazy", // default: "lazy" | explicit eager: "eager"
	},
});

// Services behind constructor deps are instantiated on first use.
// Example: a controller dependency will be materialized when the handler accesses it.
```

Notes:
- `@AutoWired` field injection remains eager to preserve required/optional validation semantics.
- Lazy behavior currently applies to constructor-injected dependencies.

To force eager constructor injection:

```typescript
await CreateApplication({
	container: {
		resolutionStrategy: "eager",
	},
});
```

## DI Instantiation Metrics
- Container tracks per-component instantiation time and instance counts.
- Metrics are enabled by default and can be disabled with `container.metricsEnabled: false`.

```typescript
const app = await CreateApplication({
	container: {
		resolutionStrategy: "lazy",
		metricsEnabled: true,
	},
});

const kernel = app.getKernel();
const container = await kernel.getContainer();

const metrics = container.getInstantiationMetrics();
// [{ componentName, scope, instancesCreated, totalInstantiationMs, averageInstantiationMs, lastInstantiationMs }]
```

## Hot Manifest Watcher (Dev)
- In development, core can watch source directories and apply incremental manifest updates.
- On file change, only the changed file is reloaded and its container bindings are invalidated/re-registered.
- This avoids full project rescans on each restart cycle during local development.

```typescript
const app = await CreateApplication({
	hotManifestWatcher: {
		enabled: true,   // default in NODE_ENV=development
		debounceMs: 60,  // optional
	},
	container: {
		resolutionStrategy: "lazy",
	},
});
```

Notes:
- Watcher is disabled by default outside development.
- It tracks `.ts` and `.js` files and ignores `.test` / `.spec` files.

Watcher lifecycle events:
- `hotManifestUpdated`: emitted after a file hot reload attempt, includes file, components, durationMs, and metrics snapshot.
- `hotManifestMetrics`: emitted after update/error with aggregate metrics (`filesHotUpdated`, `reloadErrors`, `averageUpdateMs`, `totalUpdateMs`, `lastUpdateMs`).
- `hotManifestReloadError`: emitted when a reload fails, includes file, error message, and metrics snapshot.

## Prebuilt Manifest (Production)
To avoid runtime scans in production cold starts, you can pre-generate a manifest during build:

```bash
pnpm -C packages/core prebuild:manifest
```

Programmatic usage:

```typescript
import { prebuildManifest } from "@xtaskjs/core";

await prebuildManifest({ projectRoot: process.cwd() });
```

Runtime load order in `Kernel.boot`:
- prebuilt manifest (`.xtask-manifest.prebuilt.json`) when enabled (default in production)
- cached manifest (`.xtask-manifest.json`)
- full filesystem scan fallback

You can override in app bootstrap:

```typescript
await CreateApplication({
  prebuiltManifest: { enabled: true },
});
```

## Metrics Log Configuration
- Metrics logs are disabled by default.
- Set `XTASKJS_SHOW_METRICS_LOGS=true` to show runtime metric logs like `[Metrics] Heap MB` and `CPU { ... }`.

## Import Scan Concurrency
- Autoload now imports discovered files with a bounded async pool.
- Use `XTASK_IMPORT_CONCURRENCY` to tune how many files are imported in parallel during startup scan.
- Default is `10` (and never higher than total discovered files).

Recommended tuning by project size:
- Small apps (up to ~30 files): `6-10`
- Medium apps (~30-120 files): `10-16`
- Large apps (120+ files): `16-24`

Example:

```bash
XTASK_IMPORT_CONCURRENCY=16 npm start
```

Tip:
- Avoid very high values in constrained environments (CI, small containers) because excessive parallel imports can increase filesystem pressure and reduce overall startup stability.

## Startup Benchmark
- Run `pnpm -C packages/core benchmark:startup` from the workspace root.
- Optional env vars:
	- `XTASKJS_BENCH_WARMUP` (default: `3`)
	- `XTASKJS_BENCH_ITERATIONS` (default: `10`)
	- `XTASKJS_BENCH_NODE_ENV` (default: `test`)
- Example:
	- `XTASKJS_BENCH_WARMUP=5 XTASKJS_BENCH_ITERATIONS=20 XTASKJS_BENCH_NODE_ENV=production pnpm -C packages/core benchmark:startup`

## Resources
- Project site and documentation: [xtaskjs.io](https://xtaskjs.io)
- npm package: [@xtaskjs/core](https://www.npmjs.com/package/@xtaskjs/core)
- Source repository: [xtaskjs/xtaskjs](https://github.com/xtaskjs/xtaskjs)
