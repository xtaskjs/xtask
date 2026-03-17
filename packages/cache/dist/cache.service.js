"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const lifecycle_1 = require("./lifecycle");
class CacheService {
    listModels() {
        return (0, lifecycle_1.getCacheLifecycleManager)().listModels();
    }
    isInitialized(model) {
        return (0, lifecycle_1.getCacheLifecycleManager)().isInitialized(model);
    }
    getRepository(model) {
        return (0, lifecycle_1.getCacheLifecycleManager)().getRepository(model);
    }
    async get(model, key) {
        return this.getRepository(model).get(key);
    }
    async set(model, key, value, options = {}) {
        return this.getRepository(model).set(key, value, options);
    }
    async remember(model, key, factory, options = {}) {
        return this.getRepository(model).remember(key, factory, options);
    }
    async delete(model, key) {
        return this.getRepository(model).delete(key);
    }
    async clear(model) {
        return this.getRepository(model).clear();
    }
    async keys(model) {
        return this.getRepository(model).keys();
    }
}
exports.CacheService = CacheService;
