import { ThrottleRecord, ThrottleRedisClient, ThrottleRedisConnectionOptions, ThrottleStore } from "./types";

interface MemoryEntry {
  count: number;
  resetAt: number;
}

export class MemoryThrottleStore implements ThrottleStore {
  readonly kind = "memory";
  private readonly entries = new Map<string, MemoryEntry>();

  async increment(key: string, ttlMs: number): Promise<ThrottleRecord> {
    const now = Date.now();
    const existing = this.entries.get(key);

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + ttlMs;
      this.entries.set(key, { count: 1, resetAt });
      return { count: 1, ttlMs, resetAt };
    }

    existing.count += 1;
    return { count: existing.count, ttlMs: existing.resetAt - now, resetAt: existing.resetAt };
  }

  async reset(key: string): Promise<void> {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}

const REDIS_INCREMENT_SCRIPT = `
local key = KEYS[1]
local ttl_ms = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local reset_key = key .. ":reset"

local count = redis.call("INCR", key)
if count == 1 then
  redis.call("PEXPIRE", key, ttl_ms)
  local reset_at = now + ttl_ms
  redis.call("SET", reset_key, reset_at)
  redis.call("PEXPIRE", reset_key, ttl_ms)
  return {count, reset_at}
end

local pttl = redis.call("PTTL", key)
local reset_at_raw = redis.call("GET", reset_key)
local reset_at = reset_at_raw and tonumber(reset_at_raw) or (now + pttl)
return {count, reset_at}
`.trim();

const createRedisClient = async (
  options: ThrottleRedisConnectionOptions = {}
): Promise<{ client: ThrottleRedisClient; owned: boolean }> => {
  if (options.client) {
    return { client: options.client, owned: false };
  }

  if (options.clientFactory) {
    return { client: await options.clientFactory(), owned: true };
  }

  let redisModule: any;
  try {
    redisModule = require("redis");
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" || String(error?.message || "").includes("redis");

    if (missingPackage) {
      throw new Error(
        "Redis throttle support requires the 'redis' package. Install it with: npm install redis"
      );
    }

    throw error;
  }

  if (typeof redisModule.createClient !== "function") {
    throw new Error("redis package does not export createClient");
  }

  return {
    client: redisModule.createClient({
      url: options.url,
      username: options.username,
      password: options.password,
      database: options.database,
      socket: options.socket,
      ...(options.options || {}),
    }) as ThrottleRedisClient,
    owned: true,
  };
};

export class RedisThrottleStore implements ThrottleStore {
  readonly kind = "redis";
  private client?: ThrottleRedisClient;
  private owned = false;

  constructor(private readonly options: ThrottleRedisConnectionOptions = {}) {}

  private async getClient(): Promise<ThrottleRedisClient> {
    if (this.client) {
      return this.client;
    }

    const created = await createRedisClient(this.options);
    this.client = created.client;
    this.owned = created.owned;
    return this.client;
  }

  async connect(): Promise<void> {
    const client = await this.getClient();
    if (typeof client.connect === "function" && client.isOpen !== true) {
      await client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client || !this.owned) {
      return;
    }

    if (typeof this.client.quit === "function") {
      try {
        await this.client.quit();
      } catch {
        // ignore
      }
    } else if (typeof this.client.disconnect === "function") {
      try {
        await this.client.disconnect();
      } catch {
        // ignore
      }
    }

    this.client = undefined;
  }

  async increment(key: string, ttlMs: number): Promise<ThrottleRecord> {
    const client = await this.getClient();
    const now = Date.now();
    const result = await client.eval(REDIS_INCREMENT_SCRIPT, 1, key, String(ttlMs), String(now));
    const [count, resetAt] = Array.isArray(result) ? result : [result, now + ttlMs];
    const remaining = Number(resetAt) - now;

    return {
      count: Number(count),
      ttlMs: remaining > 0 ? remaining : 0,
      resetAt: Number(resetAt),
    };
  }

  async reset(key: string): Promise<void> {
    const client = await this.getClient();
    const resetKey = `${key}:reset`;
    await client.eval(
      `redis.call("DEL", KEYS[1]); redis.call("DEL", KEYS[2]); return 1`,
      2,
      key,
      resetKey
    );
  }
}
