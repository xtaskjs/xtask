import { Controller, Get, Logger, Query } from "@xtaskjs/common";
import {
  InjectInternationalizationService,
  InternationalizationService,
} from "@xtaskjs/internationalization";

const toNumber = (value: string | undefined, fallback: number): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

@Controller("/i18n")
export class InternationalizationController {
  constructor(
    private readonly logger: Logger,
    @InjectInternationalizationService()
    private readonly intl: InternationalizationService
  ) {}

  @Get("/")
  overview(
    @Query("name") name?: string,
    @Query("items") items?: string,
    @Query("amount") amount?: string
  ) {
    const customerName = name || "guest";
    const itemCount = toNumber(items, 2);
    const totalAmount = toNumber(amount, 1499.95);
    const today = new Date("2026-03-15T10:30:00.000Z");

    this.logger.info("Rendering internationalization overview sample");

    return {
      locale: this.intl.getCurrentLocale(),
      namespaces: this.intl.listNamespaces(),
      messages: {
        title: this.intl.t("landing.title", {
          params: {
            name: customerName,
          },
        }),
        summary: this.intl.t("landing.summary", {
          params: {
            today,
            amount: totalAmount,
          },
        }),
        activity: this.intl.t("landing.activity", {
          params: {
            daysAgo: -1,
          },
        }),
        cart: this.intl.t("landing.cart.items", {
          count: itemCount,
        }),
      },
    };
  }

  @Get("/checkout")
  async checkout(
    @Query("name") name?: string,
    @Query("items") items?: string,
    @Query("amount") amount?: string
  ) {
    const customerName = name || "guest";
    const itemCount = toNumber(items, 3);
    const totalAmount = toNumber(amount, 249.5);
    const processedAt = new Date("2026-03-15T14:05:00.000Z");

    this.logger.info("Rendering internationalization checkout sample");

    await this.intl.loadNamespace("checkout");

    return {
      locale: this.intl.getCurrentLocale(),
      namespaces: this.intl.listNamespaces(),
      checkout: {
        headline: await this.intl.tAsync("checkout:summary.headline", {
          params: {
            name: customerName,
          },
        }),
        total: await this.intl.tAsync("checkout:summary.total", {
          count: itemCount,
          params: {
            count: itemCount,
            amount: totalAmount,
          },
        }),
        processed: await this.intl.tAsync("checkout:summary.processed", {
          params: {
            processedAt,
          },
        }),
      },
    };
  }
}