import { Logger } from "@xtaskjs/common";
import { Service } from "@xtaskjs/core";
import {
  CacheEvict,
  CacheModel,
  CachePut,
  CacheRepository,
  CacheService,
  Cacheable,
  InjectCacheRepository,
  InjectCacheService,
} from "@xtaskjs/cache";

export type RedisProductCacheEntry = {
  id: string;
  name: string;
  sourceLoad: number;
  generatedAt: string;
};

@CacheModel({
  name: "products",
  driver: "redis",
  ttl: "5m",
})
export class RedisProductCacheModel {}

@Service()
export class CacheRedisService {
  private sourceLoads = 0;

  constructor(
    private readonly logger: Logger,
    @InjectCacheRepository(RedisProductCacheModel)
    private readonly products: CacheRepository<RedisProductCacheEntry>,
    @InjectCacheService()
    private readonly cache: CacheService
  ) {}

  @Cacheable({
    model: RedisProductCacheModel,
    key: (id: string) => id,
  })
  async getProduct(id: string): Promise<RedisProductCacheEntry> {
    this.sourceLoads += 1;
    const product = this.buildProduct(id);
    this.logger.info(`Loaded product ${id} from the simulated source and stored it in Redis`);
    return product;
  }

  @CachePut({
    model: RedisProductCacheModel,
    key: (id: string) => id,
  })
  async refreshProduct(id: string): Promise<RedisProductCacheEntry> {
    this.sourceLoads += 1;
    const product = this.buildProduct(id);
    this.logger.info(`Refreshed Redis cache entry for product ${id}`);
    return product;
  }

  @CacheEvict({
    model: RedisProductCacheModel,
    key: (id: string) => id,
  })
  async evictProduct(id: string): Promise<boolean> {
    this.logger.info(`Evicted Redis cache entry for product ${id}`);
    return true;
  }

  async inspectProduct(id: string) {
    return this.products.getEntry(id);
  }

  async getState() {
    return {
      initialized: this.cache.isInitialized(RedisProductCacheModel),
      sourceLoads: this.sourceLoads,
      model: this.products.getSummary(),
      store: this.products.getStore().kind,
      keys: await this.cache.keys(RedisProductCacheModel),
      redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    };
  }

  private buildProduct(id: string): RedisProductCacheEntry {
    return {
      id,
      name: `Redis Product ${id}`,
      sourceLoad: this.sourceLoads,
      generatedAt: new Date().toISOString(),
    };
  }
}