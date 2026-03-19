# @xtaskjs/cache

Cache integration package for xtaskjs.

This package is part of the xtaskjs project, hosted at [xtaskjs.io](https://xtaskjs.io).

## Installation
```bash
npm install @xtaskjs/cache reflect-metadata
```

Install `redis` as well when you want the built-in Redis adapter.

```bash
npm install redis
```

## What It Provides
- Named cache models with per-model configuration.
- Memory and Redis-backed storage with a single repository API.
- Lifecycle integration so cache repositories are registered in the xtaskjs container and Redis clients are closed on shutdown.
- Injection decorators for the cache service, lifecycle manager, and model repositories.
- An operational admin service plus an opt-in controller factory for runtime inspection and clearing.
- HTTP/browser cache decorators and a service for `Cache-Control`, `ETag`, `Last-Modified`, `Vary`, and cached views.
- Method decorators for read-through caching, explicit cache writes, and eviction.

## Configure The Package
```typescript
import { configureCache } from "@xtaskjs/cache";

configureCache({
  defaultDriver: "memory",
  defaultTtl: "10m",
  namespace: "my-app",
  httpCacheDefaults: {
    visibility: "public",
    maxAge: "2m",
    etag: true,
    vary: ["accept-language"],
  },
  redis: {
    url: process.env.REDIS_URL,
  },
});
```

## Register Cache Models
```typescript
import { CacheModel } from "@xtaskjs/cache";

@CacheModel({
  name: "sessions",
  ttl: "30m",
})
class SessionCache {}

@CacheModel({
  name: "profiles",
  driver: "redis",
  ttl: "1h",
})
class ProfileCache {}
```

## Inject A Repository
```typescript
import { Service } from "@xtaskjs/core";
import {
  CacheRepository,
  InjectCacheRepository,
  InjectCacheService,
  CacheService,
} from "@xtaskjs/cache";

class ProfileCacheModel {
  id!: string;
  name!: string;
}

@Service()
class ProfileReader {
  constructor(
    @InjectCacheRepository(ProfileCache)
    private readonly profiles: CacheRepository<ProfileCacheModel>,
    @InjectCacheService()
    private readonly cache: CacheService
  ) {}

  async find(id: string) {
    return this.profiles.remember(id, async () => {
      const profile = await fetchProfileFromDatabase(id);
      return profile;
    });
  }

  async clearProfiles() {
    await this.cache.clear(ProfileCache);
  }
}
```

## Method Decorators
The cache method decorators are asynchronous because they can target Redis. Use them on methods that are already awaited by their callers.

```typescript
import { Service } from "@xtaskjs/core";
import { Cacheable, CacheEvict, CachePut } from "@xtaskjs/cache";

@Service()
class ProductService {
  private loads = 0;

  @Cacheable({ model: ProfileCache, key: (id: string) => id, ttl: "15m" })
  async getProduct(id: string) {
    this.loads += 1;
    return { id, loadNumber: this.loads };
  }

  @CachePut({ model: ProfileCache, key: (id: string) => id })
  async refreshProduct(id: string) {
    return loadFreshProduct(id);
  }

  @CacheEvict({ model: ProfileCache, key: (id: string) => id })
  async invalidateProduct(id: string) {
    return true;
  }
}
```

## Redis Configuration
When `driver: "redis"` is set, the package can either use a provided client or create one from connection settings.

```typescript
configureCache({
  redis: {
    url: process.env.REDIS_URL,
  },
});

@CacheModel({
  name: "orders",
  driver: "redis",
  ttl: "5m",
})
class OrdersCache {}
```

For advanced setups, provide `redis.client`, `redis.clientFactory`, or a custom `store` implementation per model.

## Operational Control
`CacheAdminService` gives you a small runtime management surface for listing models, checking keys, and clearing caches.

```typescript
import { Service } from "@xtaskjs/core";
import { CacheAdminService, InjectCacheAdminService } from "@xtaskjs/cache";

@Service()
class CacheInspector {
  constructor(
    @InjectCacheAdminService()
    private readonly cacheAdmin: CacheAdminService
  ) {}

  async inspect() {
    return this.cacheAdmin.listModels();
  }

  async clearSessions() {
    return this.cacheAdmin.clearModel("sessions");
  }
}
```

If you want HTTP endpoints, opt in by exporting a controller created in your app.

```typescript
import { createCacheManagementController } from "@xtaskjs/cache";

export const CacheManagementController = createCacheManagementController({
  path: "/ops/cache",
});
```

That controller exposes:
- `GET /ops/cache/models`
- `GET /ops/cache/models/:model`
- `GET /ops/cache/models/:model/entries/:key`
- `GET /ops/cache/http/routes`
- `GET /ops/cache/http/route?method=GET&path=/articles/landing`
- `DELETE /ops/cache/models/:model`
- `DELETE /ops/cache/models/:model/entries/:key`
- `DELETE /ops/cache`

## HTTP And Browser Caching
The package also includes decorators and an injectable `HttpCacheService` for browser-facing cache headers.

Package-wide defaults can be centralized with `configureCache({ httpCacheDefaults: ... })`. Route decorators can then focus on overrides.

```typescript
import { Controller, Get, Param } from "@xtaskjs/common";
import { view } from "@xtaskjs/core";
import {
  BrowserCache,
  CacheView,
  configureCache,
  InjectHttpCacheService,
  HttpCacheService,
  NoStore,
} from "@xtaskjs/cache";

configureCache({
  httpCacheDefaults: {
    visibility: "public",
    maxAge: "10m",
    etag: true,
    vary: ["accept-language"],
  },
});

@Controller("/articles")
class ArticlesController {
  constructor(
    @InjectHttpCacheService()
    private readonly httpCache: HttpCacheService
  ) {}

  @BrowserCache({
    staleWhileRevalidate: "1m",
  })
  @Get(":id")
  async show(@Param("id") id: string) {
    return findArticle(id);
  }

  @CacheView({
    maxAge: "5m",
  })
  @Get("/landing")
  async landing() {
    return view("landing", { title: "Welcome" });
  }

  @NoStore()
  @Get("/preview")
  async preview() {
    return view("preview", { draft: true });
  }

  cacheHeaderExample() {
    return this.httpCache.buildCacheControl({
      visibility: "private",
      maxAge: "60s",
      mustRevalidate: true,
    });
  }
}
```

Available decorators:
- `@CacheResponse(options)` or `@BrowserCache(options)` for generic response caching headers.
- `@CacheView(options)` to apply the same policy only when the route returns `view(...)`.
- `@NoStore()` to disable browser caching for sensitive responses.
- `@NoCache()` to require revalidation.
- `@VaryBy("accept-language", "authorization")` to append `Vary` headers.

The cache admin controller can inspect effective HTTP cache policy and validators per route. Each route summary includes the merged policy, rendered `Cache-Control` value, and validator status for `ETag`, `Last-Modified`, and `Expires`.

Supported policy options:
- `visibility`: `public` or `private`.
- `maxAge`, `sharedMaxAge`, `staleWhileRevalidate`, `staleIfError`.
- `immutable`, `noStore`, `noCache`, `mustRevalidate`, `proxyRevalidate`.
- `etag`: `true` for an automatic weak ETag or an object with a custom value generator.
- `lastModified`, `expiresIn`, `expiresAt`.
- `vary` and `viewsOnly`.

## Lifecycle Behavior
- During `CreateApplication()`: registered cache models are materialized into repositories and added to the xtaskjs container.
- During `app.close()`: owned Redis connections are closed before the DI container is destroyed.

## Resources
- Project site and documentation: [xtaskjs.io](https://xtaskjs.io)
- npm package: [@xtaskjs/cache](https://www.npmjs.com/package/@xtaskjs/cache)
- Source repository: [xtaskjs/xtaskjs](https://github.com/xtaskjs/xtaskjs)