import {
  CacheRedisClient,
  CacheRedisConnectionOptions,
  CacheStore,
  CacheStoreRecord,
  CacheStoreSetOptions,
} from "./types";

const matchesPrefix = (key: string, prefix?: string): boolean => {
  if (!prefix) {
    return true;
  }
  return key === prefix || key.startsWith(`${prefix}:`);
};

export class MemoryCacheStore implements CacheStore {
  readonly kind = "memory";
  private readonly entries = new Map<string, CacheStoreRecord>();

  async get(key: string): Promise<CacheStoreRecord | undefined> {
    const record = this.entries.get(key);
    if (!record) {
      return undefined;
    }

    if (record.expiresAt !== undefined && record.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }

    return { ...record };
  }

  async set(key: string, value: string, options: CacheStoreSetOptions = {}): Promise<void> {
    const expiresAt =
      options.ttlMs !== undefined && options.ttlMs > 0 ? Date.now() + options.ttlMs : undefined;

    this.entries.set(key, {
      key,
      value,
      expiresAt,
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.entries.delete(key);
  }

  async clear(prefix?: string): Promise<number> {
    let removed = 0;

    for (const key of Array.from(this.entries.keys())) {
      if (!matchesPrefix(key, prefix)) {
        continue;
      }

      this.entries.delete(key);
      removed += 1;
    }

    return removed;
  }

  async keys(prefix?: string): Promise<string[]> {
    const keys: string[] = [];

    for (const key of Array.from(this.entries.keys())) {
      const record = await this.get(key);
      if (!record || !matchesPrefix(key, prefix)) {
        continue;
      }
      keys.push(key);
    }

    return keys.sort();
  }
}

const createRedisClient = async (
  options: CacheRedisConnectionOptions = {}
): Promise<{ client: CacheRedisClient; owned: boolean }> => {
  if (options.client) {
    return { client: options.client, owned: false };
  }

  if (options.clientFactory) {
    return {
      client: await options.clientFactory(),
      owned: true,
    };
  }

  let redisModule: any;
  try {
    redisModule = require("redis");
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" || String(error?.message || "").includes("redis");

    if (missingPackage) {
      throw new Error("Redis cache support requires the 'redis' package. Install it with: npm install redis");
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
    }) as CacheRedisClient,
    owned: true,
  };
};

export class RedisCacheStore implements CacheStore {
  readonly kind = "redis";
  private client?: CacheRedisClient;
  private owned = false;

  constructor(private readonly options: CacheRedisConnectionOptions = {}) {}

  private async getClient(): Promise<CacheRedisClient> {
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

  async get(key: string): Promise<CacheStoreRecord | undefined> {
    const client = await this.getClient();
    const value = await client.get(key);
    if (value === null || value === undefined) {
      return undefined;
    }

    return {
      key,
      value,
    };
  }

  async set(key: string, value: string, options: CacheStoreSetOptions = {}): Promise<void> {
    const client = await this.getClient();
    if (options.ttlMs !== undefined && options.ttlMs > 0) {
      await client.set(key, value, { PX: options.ttlMs });
      return;
    }

    await client.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    const client = await this.getClient();
    const result = await client.del(key);
    return result > 0;
  }

  async clear(prefix?: string): Promise<number> {
    const keys = await this.keys(prefix);
    if (keys.length === 0) {
      return 0;
    }

    const client = await this.getClient();
    return client.del(...keys);
  }

  async keys(prefix?: string): Promise<string[]> {
    const client = await this.getClient();
    const pattern = prefix ? `${prefix}*` : "*";

    if (typeof client.scanIterator === "function") {
      const keys: string[] = [];
      for await (const key of client.scanIterator({ MATCH: pattern })) {
        keys.push(String(key));
      }
      return keys.sort();
    }

    if (typeof client.keys === "function") {
      const keys = await client.keys(pattern);
      return [...keys].sort();
    }

    throw new Error("Redis cache client must implement scanIterator() or keys() to enumerate cache keys");
  }

  async disconnect(): Promise<void> {
    if (!this.client || !this.owned) {
      return;
    }

    if (typeof this.client.quit === "function") {
      await this.client.quit();
    } else if (typeof this.client.disconnect === "function") {
      await this.client.disconnect();
    }

    this.client = undefined;
    this.owned = false;
  }
}