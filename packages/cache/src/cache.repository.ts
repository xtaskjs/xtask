import {
  CacheEntryOptions,
  CacheLookupResult,
  CacheRepositorySummary,
  CacheStore,
  CacheValueFactory,
  RegisteredCacheModelOptions,
} from "./types";
import { parseCacheDuration } from "./configuration";

const DEFAULT_ENVELOPE_MARKER = "__xtaskCacheEnvelope";

const defaultSerialize = (value: any): string => {
  return JSON.stringify({
    [DEFAULT_ENVELOPE_MARKER]: true,
    value,
  });
};

const defaultDeserialize = (value: string): any => {
  try {
    const parsedValue = JSON.parse(value);
    if (parsedValue && parsedValue[DEFAULT_ENVELOPE_MARKER] === true) {
      return parsedValue.value;
    }
    return parsedValue;
  } catch {
    return value;
  }
};

export class CacheRepository<T = any> {
  constructor(
    private readonly model: RegisteredCacheModelOptions<T>,
    private readonly store: CacheStore
  ) {}

  getSummary(): CacheRepositorySummary {
    return {
      name: this.model.name,
      driver: this.model.driver,
      namespace: this.model.namespace,
      prefix: this.model.prefix,
      ttlMs: this.model.ttlMs,
    };
  }

  getStore(): CacheStore {
    return this.store;
  }

  async get(key: string | number): Promise<T | undefined> {
    const result = await this.getEntry(key);
    return result.hit ? result.value : undefined;
  }

  async getEntry(key: string | number): Promise<CacheLookupResult<T>> {
    const normalizedKey = this.normalizeKey(key);
    const record = await this.store.get(this.resolveStorageKey(normalizedKey));
    if (!record) {
      return {
        hit: false,
        key: normalizedKey,
      };
    }

    return {
      hit: true,
      key: normalizedKey,
      value: this.deserialize(record.value),
    };
  }

  async has(key: string | number): Promise<boolean> {
    const result = await this.getEntry(key);
    return result.hit;
  }

  async set(key: string | number, value: T, options: CacheEntryOptions = {}): Promise<T> {
    const normalizedKey = this.normalizeKey(key);
    const ttlMs = options.ttl !== undefined ? parseCacheDuration(options.ttl) : this.model.ttlMs;

    await this.store.set(this.resolveStorageKey(normalizedKey), this.serialize(value), {
      ttlMs,
    });

    return value;
  }

  async remember(
    key: string | number,
    factory: CacheValueFactory<T>,
    options: CacheEntryOptions = {}
  ): Promise<T> {
    const cached = await this.getEntry(key);
    if (cached.hit) {
      return cached.value as T;
    }

    const value = await Promise.resolve(factory());
    await this.set(key, value, options);
    return value;
  }

  async delete(key: string | number): Promise<boolean> {
    return this.store.delete(this.resolveStorageKey(this.normalizeKey(key)));
  }

  async clear(): Promise<number> {
    return this.store.clear(this.resolveStoragePrefix());
  }

  async keys(): Promise<string[]> {
    const prefix = this.resolveStoragePrefix();
    const fullKeys = await this.store.keys(prefix);
    const prefixWithSeparator = `${prefix}:`;

    return fullKeys
      .map((key) => (key.startsWith(prefixWithSeparator) ? key.slice(prefixWithSeparator.length) : key))
      .sort();
  }

  private serialize(value: T): string {
    return this.model.serialize ? this.model.serialize(value) : defaultSerialize(value);
  }

  private deserialize(value: string): T {
    return this.model.deserialize ? this.model.deserialize(value) : defaultDeserialize(value);
  }

  private normalizeKey(key: string | number): string {
    return String(key);
  }

  private resolveStoragePrefix(): string {
    return `${this.model.namespace}:${this.model.prefix}`;
  }

  private resolveStorageKey(key: string): string {
    return `${this.resolveStoragePrefix()}:${key}`;
  }
}