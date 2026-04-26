import { ThrottleResult, ThrottleStore } from "./types";

export class ThrottlerService {
  constructor(private readonly store: ThrottleStore) {}

  async check(key: string, limit: number, ttlMs: number): Promise<ThrottleResult> {
    const record = await this.store.increment(key, ttlMs);

    return {
      allowed: record.count <= limit,
      count: record.count,
      limit,
      ttlMs: record.ttlMs,
      resetAt: record.resetAt,
    };
  }

  async reset(key: string): Promise<void> {
    await this.store.reset(key);
  }

  getStore(): ThrottleStore {
    return this.store;
  }
}
