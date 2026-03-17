"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheAdminService = void 0;
const http_cache_metadata_1 = require("./http-cache.metadata");
const configuration_1 = require("./configuration");
const lifecycle_1 = require("./lifecycle");
const cache_service_1 = require("./cache.service");
const http_cache_service_1 = require("./http-cache.service");
const decorators_1 = require("./decorators");
let CacheAdminService = class CacheAdminService {
    constructor(cache) {
        this.cache = cache;
    }
    async listModels() {
        const models = this.cache.listModels();
        return Promise.all(models.map(async (model) => {
            const repository = this.cache.getRepository(model.name);
            const keys = await repository.keys();
            return {
                ...model,
                keyCount: keys.length,
                store: repository.getStore().kind,
            };
        }));
    }
    async inspectModel(model) {
        const repository = this.cache.getRepository(model);
        const summary = repository.getSummary();
        const keys = await repository.keys();
        return {
            ...summary,
            keyCount: keys.length,
            store: repository.getStore().kind,
            keys,
        };
    }
    async inspectEntry(model, key) {
        const entry = await this.cache.getRepository(model).getEntry(key);
        return {
            ...entry,
            model: typeof model === "string" ? model : model.name,
        };
    }
    async clearModel(model) {
        return {
            model: typeof model === "string" ? model : model.name,
            removed: await this.cache.clear(model),
        };
    }
    async clearAll() {
        const models = this.cache.listModels();
        return Promise.all(models.map(async (model) => ({
            model: model.name,
            removed: await this.cache.clear(model.name),
        })));
    }
    async deleteEntry(model, key) {
        return this.cache.delete(model, key);
    }
    listHttpCacheRoutes() {
        const lifecycle = (0, lifecycle_1.getCacheLifecycleManager)().getLifecycle();
        if (!lifecycle) {
            return [];
        }
        return lifecycle
            .getControllerRoutes()
            .map((route) => {
            const routePolicy = (0, http_cache_metadata_1.getHttpCachePolicy)(route.controller?.constructor, route.handler);
            if (!routePolicy) {
                return undefined;
            }
            return (0, http_cache_service_1.getBaseHttpCacheService)().describeRoute({
                method: route.method,
                path: route.path,
                controller: route.controller?.constructor?.name || "AnonymousController",
                handler: String(route.handler),
            }, (0, configuration_1.resolveHttpCachePolicy)(routePolicy));
        })
            .filter((route) => Boolean(route))
            .sort((left, right) => `${left.method} ${left.path}`.localeCompare(`${right.method} ${right.path}`));
    }
    inspectHttpCacheRoute(method, path) {
        const normalizedMethod = String(method || "").trim().toUpperCase();
        const normalizedPath = String(path || "").trim();
        const route = this.listHttpCacheRoutes().find((candidate) => candidate.method === normalizedMethod && candidate.path === normalizedPath);
        if (!route) {
            throw new Error(`HTTP cache route '${normalizedMethod} ${normalizedPath}' is not registered`);
        }
        return route;
    }
};
exports.CacheAdminService = CacheAdminService;
exports.CacheAdminService = CacheAdminService = __decorate([
    __param(0, (0, decorators_1.InjectCacheService)()),
    __metadata("design:paramtypes", [cache_service_1.CacheService])
], CacheAdminService);
