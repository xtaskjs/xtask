"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCacheStore = exports.MemoryCacheStore = void 0;
const matchesPrefix = (key, prefix) => {
    if (!prefix) {
        return true;
    }
    return key === prefix || key.startsWith(`${prefix}:`);
};
class MemoryCacheStore {
    constructor() {
        this.kind = "memory";
        this.entries = new Map();
    }
    async get(key) {
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
    async set(key, value, options = {}) {
        const expiresAt = options.ttlMs !== undefined && options.ttlMs > 0 ? Date.now() + options.ttlMs : undefined;
        this.entries.set(key, {
            key,
            value,
            expiresAt,
        });
    }
    async delete(key) {
        return this.entries.delete(key);
    }
    async clear(prefix) {
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
    async keys(prefix) {
        const keys = [];
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
exports.MemoryCacheStore = MemoryCacheStore;
const createRedisClient = async (options = {}) => {
    if (options.client) {
        return { client: options.client, owned: false };
    }
    if (options.clientFactory) {
        return {
            client: await options.clientFactory(),
            owned: true,
        };
    }
    let redisModule;
    try {
        redisModule = require("redis");
    }
    catch (error) {
        const missingPackage = error?.code === "MODULE_NOT_FOUND" || String(error?.message || "").includes("redis");
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
        }),
        owned: true,
    };
};
class RedisCacheStore {
    constructor(options = {}) {
        this.options = options;
        this.kind = "redis";
        this.owned = false;
    }
    async getClient() {
        if (this.client) {
            return this.client;
        }
        const created = await createRedisClient(this.options);
        this.client = created.client;
        this.owned = created.owned;
        return this.client;
    }
    async connect() {
        const client = await this.getClient();
        if (typeof client.connect === "function" && client.isOpen !== true) {
            await client.connect();
        }
    }
    async get(key) {
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
    async set(key, value, options = {}) {
        const client = await this.getClient();
        if (options.ttlMs !== undefined && options.ttlMs > 0) {
            await client.set(key, value, { PX: options.ttlMs });
            return;
        }
        await client.set(key, value);
    }
    async delete(key) {
        const client = await this.getClient();
        const result = await client.del(key);
        return result > 0;
    }
    async clear(prefix) {
        const keys = await this.keys(prefix);
        if (keys.length === 0) {
            return 0;
        }
        const client = await this.getClient();
        return client.del(...keys);
    }
    async keys(prefix) {
        const client = await this.getClient();
        const pattern = prefix ? `${prefix}*` : "*";
        if (typeof client.scanIterator === "function") {
            const keys = [];
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
    async disconnect() {
        if (!this.client || !this.owned) {
            return;
        }
        if (typeof this.client.quit === "function") {
            await this.client.quit();
        }
        else if (typeof this.client.disconnect === "function") {
            await this.client.disconnect();
        }
        this.client = undefined;
        this.owned = false;
    }
}
exports.RedisCacheStore = RedisCacheStore;
