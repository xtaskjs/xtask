import { IIdempotencyStore } from "./types";
export declare class MemoryIdempotencyStore implements IIdempotencyStore {
    private readonly entries;
    get<TResult = any>(key: string): TResult | undefined;
    set<TResult = any>(key: string, value: TResult, ttlMs?: number): void;
    delete(key: string): void;
    clear(): void;
}
