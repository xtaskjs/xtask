import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { Controller, Get, Param } from "@xtaskjs/common";
import { ApplicationLifeCycle, Container, Service, view } from "@xtaskjs/core";
import {
  CacheAdminService,
  BrowserCache,
  CacheEvict,
  CacheHeaders,
  CacheModel,
  CachePut,
  CacheRepository,
  CacheService,
  CacheView,
  Cacheable,
  HttpCacheService,
  InjectCacheRepository,
  InjectCacheService,
  InjectCacheAdminService,
  InjectHttpCacheService,
  NoStore,
  NoCache,
  VaryBy,
  configureCache,
  createCacheManagementController,
  getCacheAdminServiceToken,
  getCacheHttpServiceToken,
  getCacheRepositoryToken,
  getCacheServiceToken,
  initializeCacheIntegration,
  registerCacheModel,
  resetCacheIntegration,
} from "../src";

type SessionPayload = {
  id: string;
  version: number;
};

@CacheModel({
  name: "sessions",
  ttl: "5m",
})
class SessionCacheModel {}

class FakeRedisClient {
  public readonly values = new Map<string, string>();
  public connected = 0;
  public closed = 0;

  async connect(): Promise<void> {
    this.connected += 1;
  }

  async get(key: string): Promise<string | null> {
    return this.values.has(key) ? this.values.get(key)! : null;
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.values.delete(key)) {
        removed += 1;
      }
    }
    return removed;
  }

  async keys(pattern: string): Promise<string[]> {
    const prefix = pattern.endsWith("*") ? pattern.slice(0, -1) : pattern;
    return Array.from(this.values.keys()).filter((key) => key.startsWith(prefix));
  }

  async quit(): Promise<void> {
    this.closed += 1;
  }
}

@Service()
class SessionReader {
  public loads = 0;

  constructor(
    @InjectCacheRepository(SessionCacheModel)
    public readonly sessions: CacheRepository<SessionPayload>,
    @InjectCacheService()
    public readonly cache: CacheService
  ) {}

  @Cacheable({
    model: SessionCacheModel,
    key: (id: string) => id,
  })
  async read(id: string): Promise<SessionPayload> {
    this.loads += 1;
    return {
      id,
      version: this.loads,
    };
  }

  @CachePut({
    model: SessionCacheModel,
    key: (id: string) => id,
  })
  async refresh(id: string): Promise<SessionPayload> {
    this.loads += 1;
    return {
      id,
      version: this.loads,
    };
  }

  @CacheEvict({
    model: SessionCacheModel,
    key: (id: string) => id,
  })
  async invalidate(id: string): Promise<boolean> {
    return id.length > 0;
  }
}

const CacheManagementController = createCacheManagementController({
  path: "/ops/cache",
});

@Controller("/internal/cache")
class CacheInspectorController {
  constructor(
    @InjectCacheAdminService()
    private readonly cacheAdmin: CacheAdminService
  ) {}

  @Get("/models")
  async listModels() {
    return this.cacheAdmin.listModels();
  }
}

@Controller("/http-cache")
class HttpCacheController {
  constructor(
    @InjectHttpCacheService()
    private readonly httpCache: HttpCacheService
  ) {}

  @BrowserCache({
    maxAge: "5m",
    vary: ["accept-language"],
  })
  @Get("/items/:id")
  async item(@Param("id") id: string) {
    return {
      id,
      version: 1,
    };
  }

  @CacheView({
    maxAge: "2m",
    lastModified: () => new Date("2026-03-17T00:00:00.000Z"),
  })
  @Get("/view")
  async dashboard() {
    return view("dashboard", { title: "Cache" }, 200);
  }

  @NoStore()
  @Get("/secret")
  async secret() {
    return { secret: true };
  }

  @NoCache()
  @VaryBy("authorization")
  @CacheHeaders({ visibility: "private" })
  @Get("/profile")
  async profile() {
    return {
      ok: true,
      policy: this.httpCache.buildCacheControl({ visibility: "private", maxAge: "30s" }),
    };
  }
}

const createMockResponse = () => {
  const headers: Record<string, string> = {};

  return {
    headers,
    headersSent: false,
    statusCode: 200,
    getHeader(name: string) {
      return headers[name.toLowerCase()];
    },
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    code(code: number) {
      this.statusCode = code;
      return this;
    },
    end(chunk?: any) {
      this.headersSent = true;
      this.body = chunk;
    },
  } as any;
};

describe("cache integration", () => {
  beforeEach(async () => {
    await resetCacheIntegration();
    configureCache({
      namespace: "tests",
      defaultDriver: "memory",
      httpCacheDefaults: {
        visibility: "public",
        maxAge: "1m",
        etag: true,
        vary: ["x-requested-with"],
      },
    });
    registerCacheModel(SessionCacheModel, {
      name: "sessions",
      ttl: "5m",
    });
  });

  afterEach(async () => {
    await resetCacheIntegration();
  });

  test("registers repositories in the container and caches method results in memory", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();
    container.register(SessionReader, { scope: "singleton" });

    await initializeCacheIntegration(container, lifecycle);

    const service = container.get(SessionReader);
    const cacheService = container.getByName<CacheService>(getCacheServiceToken());
    const cacheRepository = container.getByName<CacheRepository<SessionPayload>>(
      getCacheRepositoryToken(SessionCacheModel)
    );

    expect(cacheService.listModels()).toEqual([
      {
        name: "sessions",
        driver: "memory",
        namespace: "tests",
        prefix: "sessions",
        ttlMs: 300000,
      },
    ]);

    const first = await service.read("user-1");
    const second = await service.read("user-1");

    expect(first).toEqual({ id: "user-1", version: 1 });
    expect(second).toEqual({ id: "user-1", version: 1 });
    expect(service.loads).toBe(1);

    expect(await cacheRepository.get("user-1")).toEqual({ id: "user-1", version: 1 });
    expect(await cacheService.keys(SessionCacheModel)).toEqual(["user-1"]);

    const refreshed = await service.refresh("user-1");
    expect(refreshed).toEqual({ id: "user-1", version: 2 });
    expect(await cacheRepository.get("user-1")).toEqual({ id: "user-1", version: 2 });

    await service.invalidate("user-1");
    expect(await cacheRepository.get("user-1")).toBeUndefined();
  });

  test("supports redis-backed models and closes owned clients on shutdown", async () => {
    const fakeRedis = new FakeRedisClient();

    registerCacheModel("profiles", {
      driver: "redis",
      namespace: "tests",
      redis: {
        clientFactory: async () => fakeRedis,
      },
    });

    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();

    await initializeCacheIntegration(container, lifecycle);

    const cacheService = container.getByName<CacheService>(getCacheServiceToken());

    await cacheService.set("profiles", "ada", { id: "ada", version: 1 });
    await cacheService.set("profiles", "grace", { id: "grace", version: 2 });

    expect(await cacheService.get("profiles", "ada")).toEqual({ id: "ada", version: 1 });
    expect(await cacheService.keys("profiles")).toEqual(["ada", "grace"]);
    expect(fakeRedis.connected).toBe(1);

    await lifecycle.emit("stopping");
    expect(fakeRedis.closed).toBe(1);
  });

  test("allows bulk model clearing through the service API", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();

    await initializeCacheIntegration(container, lifecycle);
    const cacheService = container.getByName<CacheService>(getCacheServiceToken());

    await cacheService.set(SessionCacheModel, "one", { id: "one", version: 1 });
    await cacheService.set(SessionCacheModel, "two", { id: "two", version: 2 });

    expect(await cacheService.keys(SessionCacheModel)).toEqual(["one", "two"]);
    expect(await cacheService.clear(SessionCacheModel)).toBe(2);
    expect(await cacheService.keys(SessionCacheModel)).toEqual([]);
  });

  test("registers an admin service and supports opt-in controller routes", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();

    container.register(CacheManagementController, { scope: "singleton" });
    container.register(CacheInspectorController, { scope: "singleton" });

    await initializeCacheIntegration(container, lifecycle);
    await container.getByName<CacheAdminService>(getCacheAdminServiceToken()).clearAll();
    await container.getByName<CacheAdminService>(getCacheAdminServiceToken()).clearModel("sessions");
    container.registerLifeCycleListeners(lifecycle);

    const cacheService = container.getByName<CacheService>(getCacheServiceToken());
    await cacheService.set(SessionCacheModel, "alpha", { id: "alpha", version: 1 });
    await cacheService.set(SessionCacheModel, "beta", { id: "beta", version: 2 });

    const listResult = await lifecycle.dispatchControllerRoute("GET", "/ops/cache/models", {}, {} as any);
    expect(listResult).toEqual([
      expect.objectContaining({
        name: "sessions",
        keyCount: 2,
        store: "memory",
      }),
    ]);

    const inspectResult = await lifecycle.dispatchControllerRoute(
      "GET",
      "/ops/cache/models/sessions",
      {},
      {} as any
    );
    expect(inspectResult).toEqual(
      expect.objectContaining({
        name: "sessions",
        keys: ["alpha", "beta"],
      })
    );

    const entryResult = await lifecycle.dispatchControllerRoute(
      "GET",
      "/ops/cache/models/sessions/entries/alpha",
      {},
      {} as any
    );
    expect(entryResult).toEqual({
      model: "sessions",
      key: "alpha",
      hit: true,
      value: { id: "alpha", version: 1 },
    });

    const internalResult = await lifecycle.dispatchControllerRoute(
      "GET",
      "/internal/cache/models",
      {},
      {} as any
    );
    expect(internalResult).toEqual([
      expect.objectContaining({
        name: "sessions",
        keyCount: 2,
      }),
    ]);

    const deleteResult = await lifecycle.dispatchControllerRoute(
      "DELETE",
      "/ops/cache/models/sessions/entries/alpha",
      {},
      {} as any
    );
    expect(deleteResult).toEqual({
      model: "sessions",
      key: "alpha",
      deleted: true,
    });

    const clearResult = await lifecycle.dispatchControllerRoute(
      "DELETE",
      "/ops/cache/models/sessions",
      {},
      {} as any
    );
    expect(clearResult).toEqual({ model: "sessions", removed: 1 });

    const httpRoutes = await lifecycle.dispatchControllerRoute(
      "GET",
      "/ops/cache/http/routes",
      { query: {} },
      {} as any
    );
    expect(httpRoutes).toEqual([]);
  });

  test("applies browser cache headers and handles conditional requests", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();

    container.register(HttpCacheController, { scope: "singleton" });

    await initializeCacheIntegration(container, lifecycle);
    container.registerLifeCycleListeners(lifecycle);

    const response = createMockResponse();
    const firstResult = await lifecycle.dispatchControllerRoute(
      "GET",
      "/http-cache/items/42",
      { headers: { "accept-language": "en" } },
      response
    );

    expect(firstResult).toEqual({ id: "42", version: 1 });
    expect(response.headers["cache-control"]).toBe("public, max-age=300");
    expect(response.headers.vary).toBe("x-requested-with, accept-language");
    expect(response.headers.etag).toMatch(/^W\/"[a-f0-9]+"$/);

    const notModifiedResponse = createMockResponse();
    const secondResult = await lifecycle.dispatchControllerRoute(
      "GET",
      "/http-cache/items/42",
      {
        headers: {
          "accept-language": "en",
          "if-none-match": response.headers.etag,
        },
      },
      notModifiedResponse
    );

    expect(secondResult).toBeUndefined();
    expect(notModifiedResponse.statusCode).toBe(304);
    expect(notModifiedResponse.headersSent).toBe(true);
  });

  test("applies cache headers to generated views and injectable http cache service", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();

    container.register(HttpCacheController, { scope: "singleton" });

    await initializeCacheIntegration(container, lifecycle);
    container.registerLifeCycleListeners(lifecycle);

    const controller = container.get(HttpCacheController);
    const injectedService = container.getByName<HttpCacheService>(getCacheHttpServiceToken());
    expect((controller as any).httpCache).toBe(injectedService);

    const viewResponse = createMockResponse();
    const viewResult = await lifecycle.dispatchControllerRoute(
      "GET",
      "/http-cache/view",
      { headers: {} },
      viewResponse
    );

    expect(viewResult).toEqual(view("dashboard", { title: "Cache" }, 200));
    expect(viewResponse.headers["cache-control"]).toBe("public, max-age=120");
    expect(viewResponse.headers["last-modified"]).toBe("Tue, 17 Mar 2026 00:00:00 GMT");
    expect(viewResponse.headers.vary).toBe("x-requested-with");
    expect(viewResponse.headers.etag).toMatch(/^W\/"[a-f0-9]+"$/);
  });

  test("supports no-store and no-cache response policies", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();

    container.register(HttpCacheController, { scope: "singleton" });

    await initializeCacheIntegration(container, lifecycle);
    container.registerLifeCycleListeners(lifecycle);

    const secretResponse = createMockResponse();
    const secretResult = await lifecycle.dispatchControllerRoute(
      "GET",
      "/http-cache/secret",
      { headers: {} },
      secretResponse
    );

    expect(secretResult).toEqual({ secret: true });
    expect(secretResponse.headers["cache-control"]).toBe("no-store, no-cache, must-revalidate");
    expect(secretResponse.headers.pragma).toBe("no-cache");
    expect(secretResponse.headers.expires).toBe("Thu, 01 Jan 1970 00:00:00 GMT");

    const profileResponse = createMockResponse();
    const profileResult = await lifecycle.dispatchControllerRoute(
      "GET",
      "/http-cache/profile",
      { headers: {} },
      profileResponse
    );

    expect(profileResult).toEqual({
      ok: true,
      policy: "private, max-age=30",
    });
    expect(profileResponse.headers["cache-control"]).toBe(
      "private, max-age=0, no-cache, must-revalidate"
    );
    expect(profileResponse.headers.vary).toBe("x-requested-with, authorization");
  });

  test("inspects effective HTTP cache policy and validators per route from the admin controller", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();

    container.register(CacheManagementController, { scope: "singleton" });
    container.register(HttpCacheController, { scope: "singleton" });

    await initializeCacheIntegration(container, lifecycle);
    container.registerLifeCycleListeners(lifecycle);

    const routeSummaries = await lifecycle.dispatchControllerRoute(
      "GET",
      "/ops/cache/http/routes",
      { query: {} },
      {} as any
    );

    expect(routeSummaries).toEqual([
      expect.objectContaining({
        method: "GET",
        path: "/http-cache/items/:id",
        cacheControl: "public, max-age=300",
        policy: expect.objectContaining({
          vary: ["x-requested-with", "accept-language"],
        }),
        validators: expect.objectContaining({
          etag: expect.objectContaining({ enabled: true, weak: true, customValue: false }),
        }),
      }),
      expect.objectContaining({
        method: "GET",
        path: "/http-cache/profile",
        cacheControl: "private, max-age=0, no-cache, must-revalidate",
        validators: expect.objectContaining({
          etag: expect.objectContaining({ enabled: false }),
        }),
      }),
      expect.objectContaining({
        method: "GET",
        path: "/http-cache/secret",
        cacheControl: "no-store, no-cache, must-revalidate",
      }),
      expect.objectContaining({
        method: "GET",
        path: "/http-cache/view",
        cacheControl: "public, max-age=120",
        policy: expect.objectContaining({
          vary: ["x-requested-with"],
        }),
        validators: expect.objectContaining({
          etag: expect.objectContaining({ enabled: true }),
          lastModified: expect.objectContaining({ enabled: true, dynamic: true }),
        }),
      }),
    ]);

    const singleRoute = await lifecycle.dispatchControllerRoute(
      "GET",
      "/ops/cache/http/route",
      {
        query: {
          method: "GET",
          path: "/http-cache/view",
        },
      },
      {} as any
    );

    expect(singleRoute).toEqual(
      expect.objectContaining({
        method: "GET",
        path: "/http-cache/view",
        controller: "HttpCacheController",
        handler: "dashboard",
        cacheControl: "public, max-age=120",
        policy: expect.objectContaining({
          visibility: "public",
          maxAgeMs: 120000,
          vary: ["x-requested-with"],
          viewsOnly: true,
        }),
        validators: expect.objectContaining({
          etag: expect.objectContaining({ enabled: true, weak: true, customValue: false }),
          lastModified: expect.objectContaining({ enabled: true, dynamic: true }),
          expires: expect.objectContaining({ enabled: true, mode: "max-age" }),
        }),
      })
    );
  });
});