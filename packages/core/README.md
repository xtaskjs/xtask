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

## Resources
- Project site and documentation: [xtaskjs.io](https://xtaskjs.io)
- npm package: [@xtaskjs/core](https://www.npmjs.com/package/@xtaskjs/core)
- Source repository: [xtaskjs/xtaskjs](https://github.com/xtaskjs/xtaskjs)
