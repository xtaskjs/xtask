import { Controller, Get, Param } from "@xtaskjs/common";
import { createCacheManagementController } from "@xtaskjs/cache";
import { CacheRedisService } from "./cache-redis.service";

export const CacheManagementController = createCacheManagementController({
  path: "/ops/cache",
});

@Controller("/cache")
export class CacheController {
  constructor(private readonly cacheRedisService: CacheRedisService) {}

  @Get("/products/:id")
  async product(@Param("id") id: string) {
    return this.cacheRedisService.getProduct(id);
  }

  @Get("/products/:id/inspect")
  async inspect(@Param("id") id: string) {
    return this.cacheRedisService.inspectProduct(id);
  }

  @Get("/products/:id/refresh")
  async refresh(@Param("id") id: string) {
    return this.cacheRedisService.refreshProduct(id);
  }

  @Get("/products/:id/evict")
  async evict(@Param("id") id: string) {
    const evicted = await this.cacheRedisService.evictProduct(id);
    return {
      id,
      evicted,
    };
  }

  @Get("/state")
  async state() {
    return this.cacheRedisService.getState();
  }
}