import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { Container, Service } from "@xtaskjs/core";
import { ApplicationLifeCycle } from "@xtaskjs/core";
import { Controller, Get, GuardLike } from "@xtaskjs/common";
import {
  configureThrottler,
  getThrottlerServiceToken,
  getThrottlerLifecycleToken,
  initializeThrottlerIntegration,
  resetThrottlerIntegration,
  shutdownThrottlerIntegration,
  Throttle,
  ThrottlerService,
  ThrottlerLifecycleManager,
  MemoryThrottleStore,
  throttlerGuard,
} from "../src";

// ── Helpers ──────────────────────────────────────────────────────────────────

const buildContext = (overrides: Record<string, any> = {}): any => ({
  method: "GET",
  path: "/",
  args: [],
  state: {},
  auth: { isAuthenticated: false, roles: [] },
  request: { ip: "127.0.0.1", headers: {}, socket: {} },
  ...overrides,
});

const invokeGuard = async (guard: GuardLike, context: any): Promise<boolean> => {
  if (typeof guard === "function") {
    return guard(context);
  }
  return guard.canActivate(context);
};

// ── MemoryThrottleStore ───────────────────────────────────────────────────────

describe("MemoryThrottleStore", () => {
  let store: MemoryThrottleStore;

  beforeEach(() => {
    store = new MemoryThrottleStore();
  });

  test("increments count from 1 on first call", async () => {
    const result = await store.increment("user:1", 60_000);
    expect(result.count).toBe(1);
    expect(result.ttlMs).toBeGreaterThan(0);
    expect(result.resetAt).toBeGreaterThan(Date.now() - 1);
  });

  test("increments subsequent calls for the same key", async () => {
    await store.increment("user:1", 60_000);
    await store.increment("user:1", 60_000);
    const result = await store.increment("user:1", 60_000);
    expect(result.count).toBe(3);
  });

  test("resets count after TTL expires", async () => {
    const ttlMs = 50;
    await store.increment("user:2", ttlMs);
    await new Promise((resolve) => setTimeout(resolve, ttlMs + 20));
    const result = await store.increment("user:2", ttlMs);
    expect(result.count).toBe(1);
  });

  test("reset() removes the key", async () => {
    await store.increment("user:3", 60_000);
    await store.reset("user:3");
    const result = await store.increment("user:3", 60_000);
    expect(result.count).toBe(1);
  });

  test("different keys are tracked independently", async () => {
    await store.increment("a", 60_000);
    await store.increment("a", 60_000);
    const b = await store.increment("b", 60_000);
    expect(b.count).toBe(1);
  });
});

// ── ThrottlerService ──────────────────────────────────────────────────────────

describe("ThrottlerService", () => {
  let service: ThrottlerService;

  beforeEach(() => {
    service = new ThrottlerService(new MemoryThrottleStore());
  });

  test("allows requests within the limit", async () => {
    const result = await service.check("ip:1", 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1);
    expect(result.limit).toBe(3);
  });

  test("blocks the request exceeding the limit", async () => {
    await service.check("ip:2", 2, 60_000);
    await service.check("ip:2", 2, 60_000);
    const result = await service.check("ip:2", 2, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.count).toBe(3);
  });

  test("reset() re-allows requests", async () => {
    await service.check("ip:3", 1, 60_000);
    await service.reset("ip:3");
    const result = await service.check("ip:3", 1, 60_000);
    expect(result.allowed).toBe(true);
  });
});

// ── @Throttle decorator + throttlerGuard ──────────────────────────────────────

@Controller("/")
@Throttle(2, "1m")
class ThrottledController {
  @Get("/hello")
  hello() {
    return { message: "hello" };
  }

  @Get("/strict")
  @Throttle(1, "30s")
  strict() {
    return { message: "strict" };
  }
}

describe("throttlerGuard + @Throttle", () => {
  let lifecycle: ThrottlerLifecycleManager;

  beforeEach(async () => {
    resetThrottlerIntegration();
    const container = new Container();
    const appLifecycle = new ApplicationLifeCycle();
    await initializeThrottlerIntegration(container, appLifecycle);
    const lm: ThrottlerLifecycleManager | undefined = (container as any).getByName?.(
      getThrottlerLifecycleToken()
    );
    lifecycle = lm!;
  });

  afterEach(async () => {
    await shutdownThrottlerIntegration();
    resetThrottlerIntegration();
  });

  test("allows first request within class-level throttle", async () => {
    const context = buildContext({
      controller: new ThrottledController(),
      handler: "hello",
    });

    const result = await invokeGuard(throttlerGuard, context);
    expect(result).toBe(true);
  });

  test("blocks request exceeding class-level throttle", async () => {
    const ip = "10.0.0.1";
    for (let i = 0; i < 2; i++) {
      const ctx = buildContext({
        controller: new ThrottledController(),
        handler: "hello",
        request: { ip, headers: {}, socket: {} },
      });
      await invokeGuard(throttlerGuard, ctx);
    }

    const ctx = buildContext({
      controller: new ThrottledController(),
      handler: "hello",
      request: { ip, headers: {}, socket: {} },
    });

    await expect(invokeGuard(throttlerGuard, ctx)).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  test("method-level @Throttle overrides class-level for that route", async () => {
    const ip = "10.0.0.2";
    const ctx1 = buildContext({
      controller: new ThrottledController(),
      handler: "strict",
      request: { ip, headers: {}, socket: {} },
    });
    await invokeGuard(throttlerGuard, ctx1);

    const ctx2 = buildContext({
      controller: new ThrottledController(),
      handler: "strict",
      request: { ip, headers: {}, socket: {} },
    });
    await expect(invokeGuard(throttlerGuard, ctx2)).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  test("x-forwarded-for header is used as the key if present", async () => {
    for (let i = 0; i < 2; i++) {
      const ctx = buildContext({
        controller: new ThrottledController(),
        handler: "hello",
        request: {
          ip: "127.0.0.1",
          headers: { "x-forwarded-for": "203.0.113.5, 198.51.100.1" },
          socket: {},
        },
      });
      await invokeGuard(throttlerGuard, ctx);
    }

    const ctx = buildContext({
      controller: new ThrottledController(),
      handler: "hello",
      request: {
        ip: "127.0.0.1",
        headers: { "x-forwarded-for": "203.0.113.5, 198.51.100.1" },
        socket: {},
      },
    });

    await expect(invokeGuard(throttlerGuard, ctx)).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  test("skipIf bypasses throttle check", async () => {
    resetThrottlerIntegration();
    configureThrottler({ skipIf: () => true });
    const container = new Container();
    const appLifecycle = new ApplicationLifeCycle();
    await initializeThrottlerIntegration(container, appLifecycle);

    const ip = "10.0.0.3";
    for (let i = 0; i < 10; i++) {
      const ctx = buildContext({
        controller: new ThrottledController(),
        handler: "hello",
        request: { ip, headers: {}, socket: {} },
      });
      const result = await invokeGuard(throttlerGuard, ctx);
      expect(result).toBe(true);
    }
  });
});

// ── ThrottlerLifecycleManager ─────────────────────────────────────────────────

describe("ThrottlerLifecycleManager", () => {
  afterEach(async () => {
    await shutdownThrottlerIntegration();
    resetThrottlerIntegration();
  });

  test("initializes and registers DI bindings", async () => {
    const container = new Container();
    const appLifecycle = new ApplicationLifeCycle();
    await initializeThrottlerIntegration(container, appLifecycle);

    const lm: ThrottlerLifecycleManager | undefined = (container as any).getByName?.(getThrottlerLifecycleToken());

    expect(lm).toBeDefined();
    expect(lm!.isInitialized()).toBe(true);
    expect(lm!.getService()).toBeDefined();
    expect(lm!.getStore()).toBeDefined();
  });

  test("registers ThrottlerService token", async () => {
    const container = new Container();
    await initializeThrottlerIntegration(container);

    const service: ThrottlerService | undefined = (container as any).getByName?.(getThrottlerServiceToken());

    expect(service).toBeInstanceOf(ThrottlerService);
  });

  test("uses memory store by default", async () => {
    const container = new Container();
    await initializeThrottlerIntegration(container);

    const lm: ThrottlerLifecycleManager = (container as any).getByName(getThrottlerLifecycleToken());

    expect(lm.getStore()?.kind).toBe("memory");
  });

  test("destroy() clears the lifecycle manager", async () => {
    const container = new Container();
    await initializeThrottlerIntegration(container);

    const lm: ThrottlerLifecycleManager = (container as any).getByName(getThrottlerLifecycleToken());

    await shutdownThrottlerIntegration();
    expect(lm.isInitialized()).toBe(false);
    expect(lm.getService()).toBeUndefined();
  });
});
