import { Controller, Delete, Get, Param, Query } from "@xtaskjs/common";
import { CacheAdminService } from "./admin.service";
import { CacheManagementControllerOptions } from "./types";
import { InjectCacheAdminService } from "./decorators";

export const createCacheManagementController = (
  options: CacheManagementControllerOptions = {}
): new (...args: any[]) => any => {
  @Controller(options.path || "/cache")
  class CacheManagementController {
    constructor(
      @InjectCacheAdminService()
      private readonly cacheAdmin: CacheAdminService
    ) {}

    @Get("/models")
    async listModels() {
      return this.cacheAdmin.listModels();
    }

    @Get("/models/:model")
    async inspectModel(@Param("model") model: string) {
      return this.cacheAdmin.inspectModel(model);
    }

    @Get("/models/:model/entries/:key")
    async inspectEntry(@Param("model") model: string, @Param("key") key: string) {
      return this.cacheAdmin.inspectEntry(model, key);
    }

    @Get("/http/routes")
    async listHttpRoutes() {
      return this.cacheAdmin.listHttpCacheRoutes();
    }

    @Get("/http/route")
    async inspectHttpRoute(@Query("method") method: string, @Query("path") path: string) {
      return this.cacheAdmin.inspectHttpCacheRoute(method, path);
    }

    @Delete("/models/:model")
    async clearModel(@Param("model") model: string) {
      return this.cacheAdmin.clearModel(model);
    }

    @Delete("/models/:model/entries/:key")
    async deleteEntry(@Param("model") model: string, @Param("key") key: string) {
      return {
        model,
        key,
        deleted: await this.cacheAdmin.deleteEntry(model, key),
      };
    }

    @Delete("/")
    async clearAll() {
      return this.cacheAdmin.clearAll();
    }
  }

  return CacheManagementController;
};