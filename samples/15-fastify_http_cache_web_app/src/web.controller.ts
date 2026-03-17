import { Controller, Get, Logger, Param } from "@xtaskjs/common";
import {
  BrowserCache,
  CacheView,
  HttpCacheService,
  InjectHttpCacheService,
  NoStore,
  createCacheManagementController,
} from "@xtaskjs/cache";
import { view } from "@xtaskjs/core";

const PUBLISHED_AT = new Date("2026-03-17T00:00:00.000Z");

export const CacheManagementController = createCacheManagementController({
  path: "/ops/cache",
});

@Controller("/")
export class WebController {
  constructor(
    private readonly logger: Logger,
    @InjectHttpCacheService()
    private readonly httpCache: HttpCacheService
  ) {}

  @CacheView({
    maxAge: "10m",
    lastModified: () => PUBLISHED_AT,
  })
  @Get("/")
  home() {
    this.logger.info("Rendering cached home page through Fastify");
    return view("home", {
      title: "xTaskJS HTTP Cache Sample",
      subtitle: "Rendered HTML with centralized browser-cache defaults and per-route overrides.",
      cacheHeader: this.httpCache.buildCacheControl({
        visibility: "public",
        maxAge: "10m",
        mustRevalidate: true,
      }),
    });
  }

  @CacheView({
    maxAge: "5m",
    lastModified: () => PUBLISHED_AT,
  })
  @Get("/articles/:slug")
  article(@Param("slug") slug: string) {
    this.logger.info(`Rendering cached article page for ${slug} through Fastify`);
    return view("article", {
      title: `Article ${slug}`,
      slug,
      lastPublished: PUBLISHED_AT.toUTCString(),
    });
  }

  @BrowserCache({
    maxAge: "1m",
    staleWhileRevalidate: "30s",
  })
  @Get("/api/articles/:slug")
  articleApi(@Param("slug") slug: string) {
    this.logger.info(`Serving cached article JSON for ${slug} through Fastify`);
    return {
      slug,
      title: `Article ${slug}`,
      cacheControl: this.httpCache.buildCacheControl({
        visibility: "public",
        maxAge: "1m",
        staleWhileRevalidate: "30s",
      }),
      publishedAt: PUBLISHED_AT.toISOString(),
    };
  }

  @NoStore()
  @Get("/preview")
  preview() {
    this.logger.info("Rendering uncached preview page through Fastify");
    return view("preview", {
      title: "Draft Preview",
      generatedAt: new Date().toISOString(),
    });
  }
}