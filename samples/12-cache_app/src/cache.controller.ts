import { Controller, Get, Param } from "@xtaskjs/common";
import { createCacheManagementController } from "@xtaskjs/cache";
import { CacheDemoService } from "./cache-demo.service";

export const CacheManagementController = createCacheManagementController({
  path: "/ops/cache",
});

@Controller("/cache")
export class CacheController {
  constructor(private readonly cacheDemoService: CacheDemoService) {}

  @Get("/products/:id")
  async product(@Param("id") id: string) {
    return this.cacheDemoService.getProduct(id);
  }

  @Get("/products/:id/inspect")
  async inspect(@Param("id") id: string) {
    return this.cacheDemoService.inspectProduct(id);
  }

  @Get("/products/:id/refresh")
  async refresh(@Param("id") id: string) {
    return this.cacheDemoService.refreshProduct(id);
  }

  @Get("/products/:id/evict")
  async evict(@Param("id") id: string) {
    const evicted = await this.cacheDemoService.evictProduct(id);
    return {
      id,
      evicted,
    };
  }

  @Get("/state")
  async state() {
    return this.cacheDemoService.getState();
  }
}