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

export type ProductCacheEntry = {
  id: string;
  name: string;
  sourceLoad: number;
  generatedAt: string;
};

@CacheModel({
  name: "products",
  ttl: "45s",
})
export class ProductCacheModel {}

@Service()
export class CacheDemoService {
  private sourceLoads = 0;

  constructor(
    private readonly logger: Logger,
    @InjectCacheRepository(ProductCacheModel)
    private readonly products: CacheRepository<ProductCacheEntry>,
    @InjectCacheService()
    private readonly cache: CacheService
  ) {}

  @Cacheable({
    model: ProductCacheModel,
    key: (id: string) => id,
  })
  async getProduct(id: string): Promise<ProductCacheEntry> {
    this.sourceLoads += 1;
    const product = this.buildProduct(id);
    this.logger.info(`Loaded product ${id} from the simulated data source`);
    return product;
  }

  @CachePut({
    model: ProductCacheModel,
    key: (id: string) => id,
  })
  async refreshProduct(id: string): Promise<ProductCacheEntry> {
    this.sourceLoads += 1;
    const product = this.buildProduct(id);
    this.logger.info(`Refreshed cached product ${id}`);
    return product;
  }

  @CacheEvict({
    model: ProductCacheModel,
    key: (id: string) => id,
  })
  async evictProduct(id: string): Promise<boolean> {
    this.logger.info(`Evicted cached product ${id}`);
    return true;
  }

  async inspectProduct(id: string) {
    return this.products.getEntry(id);
  }

  async getState() {
    return {
      initialized: this.cache.isInitialized(ProductCacheModel),
      sourceLoads: this.sourceLoads,
      model: this.products.getSummary(),
      keys: await this.cache.keys(ProductCacheModel),
    };
  }

  private buildProduct(id: string): ProductCacheEntry {
    return {
      id,
      name: `Product ${id}`,
      sourceLoad: this.sourceLoads,
      generatedAt: new Date().toISOString(),
    };
  }
}