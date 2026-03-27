"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryIdempotencyStore = void 0;
class MemoryIdempotencyStore {
    constructor() {
        this.entries = new Map();
    }
    get(key) {
        const entry = this.entries.get(key);
        if (!entry) {
            return undefined;
        }
        if (typeof entry.expiresAt === "number" && entry.expiresAt <= Date.now()) {
            this.entries.delete(key);
            return undefined;
        }
        return entry.value;
    }
    set(key, value, ttlMs) {
        const expiresAt = typeof ttlMs === "number" && ttlMs > 0 ? Date.now() + ttlMs : undefined;
        this.entries.set(key, { value, expiresAt });
    }
    delete(key) {
        this.entries.delete(key);
    }
    clear() {
        this.entries.clear();
    }
}
exports.MemoryIdempotencyStore = MemoryIdempotencyStore;
