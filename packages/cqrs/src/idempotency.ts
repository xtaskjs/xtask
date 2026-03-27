import { IIdempotencyStore } from "./types";

type Entry = {
  value: any;
  expiresAt?: number;
};

export class MemoryIdempotencyStore implements IIdempotencyStore {
  private readonly entries = new Map<string, Entry>();

  get<TResult = any>(key: string): TResult | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }

    if (typeof entry.expiresAt === "number" && entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.value as TResult;
  }

  set<TResult = any>(key: string, value: TResult, ttlMs?: number): void {
    const expiresAt = typeof ttlMs === "number" && ttlMs > 0 ? Date.now() + ttlMs : undefined;
    this.entries.set(key, { value, expiresAt });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}