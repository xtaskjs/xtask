"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheRepository = void 0;
const configuration_1 = require("./configuration");
const DEFAULT_ENVELOPE_MARKER = "__xtaskCacheEnvelope";
const defaultSerialize = (value) => {
    return JSON.stringify({
        [DEFAULT_ENVELOPE_MARKER]: true,
        value,
    });
};
const defaultDeserialize = (value) => {
    try {
        const parsedValue = JSON.parse(value);
        if (parsedValue && parsedValue[DEFAULT_ENVELOPE_MARKER] === true) {
            return parsedValue.value;
        }
        return parsedValue;
    }
    catch {
        return value;
    }
};
class CacheRepository {
    constructor(model, store) {
        this.model = model;
        this.store = store;
    }
    getSummary() {
        return {
            name: this.model.name,
            driver: this.model.driver,
            namespace: this.model.namespace,
            prefix: this.model.prefix,
            ttlMs: this.model.ttlMs,
        };
    }
    getStore() {
        return this.store;
    }
    async get(key) {
        const result = await this.getEntry(key);
        return result.hit ? result.value : undefined;
    }
    async getEntry(key) {
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
    async has(key) {
        const result = await this.getEntry(key);
        return result.hit;
    }
    async set(key, value, options = {}) {
        const normalizedKey = this.normalizeKey(key);
        const ttlMs = options.ttl !== undefined ? (0, configuration_1.parseCacheDuration)(options.ttl) : this.model.ttlMs;
        await this.store.set(this.resolveStorageKey(normalizedKey), this.serialize(value), {
            ttlMs,
        });
        return value;
    }
    async remember(key, factory, options = {}) {
        const cached = await this.getEntry(key);
        if (cached.hit) {
            return cached.value;
        }
        const value = await Promise.resolve(factory());
        await this.set(key, value, options);
        return value;
    }
    async delete(key) {
        return this.store.delete(this.resolveStorageKey(this.normalizeKey(key)));
    }
    async clear() {
        return this.store.clear(this.resolveStoragePrefix());
    }
    async keys() {
        const prefix = this.resolveStoragePrefix();
        const fullKeys = await this.store.keys(prefix);
        const prefixWithSeparator = `${prefix}:`;
        return fullKeys
            .map((key) => (key.startsWith(prefixWithSeparator) ? key.slice(prefixWithSeparator.length) : key))
            .sort();
    }
    serialize(value) {
        return this.model.serialize ? this.model.serialize(value) : defaultSerialize(value);
    }
    deserialize(value) {
        return this.model.deserialize ? this.model.deserialize(value) : defaultDeserialize(value);
    }
    normalizeKey(key) {
        return String(key);
    }
    resolveStoragePrefix() {
        return `${this.model.namespace}:${this.model.prefix}`;
    }
    resolveStorageKey(key) {
        return `${this.resolveStoragePrefix()}:${key}`;
    }
}
exports.CacheRepository = CacheRepository;
