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
exports.createCacheManagementController = void 0;
const common_1 = require("@xtaskjs/common");
const admin_service_1 = require("./admin.service");
const decorators_1 = require("./decorators");
const createCacheManagementController = (options = {}) => {
    let CacheManagementController = class CacheManagementController {
        constructor(cacheAdmin) {
            this.cacheAdmin = cacheAdmin;
        }
        async listModels() {
            return this.cacheAdmin.listModels();
        }
        async inspectModel(model) {
            return this.cacheAdmin.inspectModel(model);
        }
        async inspectEntry(model, key) {
            return this.cacheAdmin.inspectEntry(model, key);
        }
        async listHttpRoutes() {
            return this.cacheAdmin.listHttpCacheRoutes();
        }
        async inspectHttpRoute(method, path) {
            return this.cacheAdmin.inspectHttpCacheRoute(method, path);
        }
        async clearModel(model) {
            return this.cacheAdmin.clearModel(model);
        }
        async deleteEntry(model, key) {
            return {
                model,
                key,
                deleted: await this.cacheAdmin.deleteEntry(model, key),
            };
        }
        async clearAll() {
            return this.cacheAdmin.clearAll();
        }
    };
    __decorate([
        (0, common_1.Get)("/models"),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Promise)
    ], CacheManagementController.prototype, "listModels", null);
    __decorate([
        (0, common_1.Get)("/models/:model"),
        __param(0, (0, common_1.Param)("model")),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String]),
        __metadata("design:returntype", Promise)
    ], CacheManagementController.prototype, "inspectModel", null);
    __decorate([
        (0, common_1.Get)("/models/:model/entries/:key"),
        __param(0, (0, common_1.Param)("model")),
        __param(1, (0, common_1.Param)("key")),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, String]),
        __metadata("design:returntype", Promise)
    ], CacheManagementController.prototype, "inspectEntry", null);
    __decorate([
        (0, common_1.Get)("/http/routes"),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Promise)
    ], CacheManagementController.prototype, "listHttpRoutes", null);
    __decorate([
        (0, common_1.Get)("/http/route"),
        __param(0, (0, common_1.Query)("method")),
        __param(1, (0, common_1.Query)("path")),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, String]),
        __metadata("design:returntype", Promise)
    ], CacheManagementController.prototype, "inspectHttpRoute", null);
    __decorate([
        (0, common_1.Delete)("/models/:model"),
        __param(0, (0, common_1.Param)("model")),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String]),
        __metadata("design:returntype", Promise)
    ], CacheManagementController.prototype, "clearModel", null);
    __decorate([
        (0, common_1.Delete)("/models/:model/entries/:key"),
        __param(0, (0, common_1.Param)("model")),
        __param(1, (0, common_1.Param)("key")),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, String]),
        __metadata("design:returntype", Promise)
    ], CacheManagementController.prototype, "deleteEntry", null);
    __decorate([
        (0, common_1.Delete)("/"),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Promise)
    ], CacheManagementController.prototype, "clearAll", null);
    CacheManagementController = __decorate([
        (0, common_1.Controller)(options.path || "/cache"),
        __param(0, (0, decorators_1.InjectCacheAdminService)()),
        __metadata("design:paramtypes", [admin_service_1.CacheAdminService])
    ], CacheManagementController);
    return CacheManagementController;
};
exports.createCacheManagementController = createCacheManagementController;
