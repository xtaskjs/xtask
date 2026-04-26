# @xtaskjs/throttler

Rate limiter integration for [xtaskjs.io](https://xtaskjs.io). Throttler ensures that users can only make a limited number of requests per TTL window to each endpoint. Users are identified by their IP address by default, and a custom key generator can be provided for alternative identification strategies.

Throttler includes a built-in in-memory store to track request counts. It also supports Redis as an alternative storage provider through an optional peer dependency.

The package integrates automatically with the xtaskjs dependency container and the xtaskjs lifecycle. When `@xtaskjs/throttler` is installed in an xtaskjs application, it is discovered and initialized without requiring manual wiring.

## Installation

```bash
npm install @xtaskjs/throttler
```

For Redis-backed throttling, also install the `redis` package:

```bash
npm install redis
```

## Quick Start

### Global configuration

```ts
import { configureThrottler } from "@xtaskjs/throttler";

configureThrottler({
  limit: 100,    // max requests per TTL window
  ttl: "1m",     // window duration (ms, s, m, h, d)
  driver: "memory", // "memory" | "redis"
});
```

### Applying the decorator

```ts
import { Controller, Get } from "@xtaskjs/common";
import { Throttle } from "@xtaskjs/throttler";

@Controller("/api")
export class ItemsController {

  // Inherits the global configuration (100 req / 1 min)
  @Throttle(10, "30s")
  @Get("/items")
  listItems() {
    return [];
  }
}
```

`@Throttle` can be applied at the **class** level (applies to all routes) or at the **method** level (applies to a specific route). A method-level decorator always takes precedence over the class-level one.

### TTL format

| Input | Meaning |
|-------|---------|
| `500` / `"500ms"` | 500 milliseconds |
| `"30s"` | 30 seconds |
| `"5m"` | 5 minutes |
| `"1h"` | 1 hour |
| `"1d"` | 1 day |

### Custom key generator

By default the request is identified by the first value of `X-Forwarded-For`, then `request.ip`, then `socket.remoteAddress`.

```ts
configureThrottler({
  limit: 60,
  ttl: "1m",
  keyGenerator: ({ request }) => request?.user?.id ?? request?.ip ?? "unknown",
});
```

### `skipIf`

Skip throttling entirely for certain requests:

```ts
configureThrottler({
  skipIf: ({ request }) => request?.headers?.["x-internal-token"] === process.env.INTERNAL_TOKEN,
});
```

### Redis store

```ts
configureThrottler({
  driver: "redis",
  redis: { url: "redis://localhost:6379" },
});
```

You can pass an existing `redis` client instance:

```ts
import { createClient } from "redis";

const client = createClient({ url: "redis://localhost:6379" });
await client.connect();

configureThrottler({
  driver: "redis",
  redis: { client },
});
```

### Injecting `ThrottlerService`

```ts
import { AutoWired, Qualifier } from "@xtaskjs/core";
import { ThrottlerService, getThrottlerServiceToken } from "@xtaskjs/throttler";

export class MyService {
  @AutoWired()
  @Qualifier(getThrottlerServiceToken())
  private throttler!: ThrottlerService;

  async resetLimit(ip: string) {
    await this.throttler.reset(ip);
  }
}
```

## Resources

- [Website](https://xtaskjs.io)
- [npm package](https://www.npmjs.com/package/@xtaskjs/throttler)
- [Source repository](https://github.com/xtaskjs/xtask)
