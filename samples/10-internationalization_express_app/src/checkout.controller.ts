import { Controller, Get, Logger, Query } from "@xtaskjs/common";
import { view } from "@xtaskjs/core";
import {
  InjectInternationalizationService,
  InternationalizationService,
} from "@xtaskjs/internationalization";

const toNumber = (value: string | undefined, fallback: number): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const buildQuery = (locale: string, name: string, items: number, amount: number): string => {
  return `locale=${encodeURIComponent(locale)}&name=${encodeURIComponent(name)}&items=${encodeURIComponent(String(items))}&amount=${encodeURIComponent(String(amount))}`;
};

@Controller("/checkout")
export class CheckoutController {
  constructor(
    private readonly logger: Logger,
    @InjectInternationalizationService()
    private readonly intl: InternationalizationService
  ) {}

  @Get("/")
  async checkout(
    @Query("name") name?: string,
    @Query("items") items?: string,
    @Query("amount") amount?: string
  ) {
    const customerName = name || "guest";
    const itemCount = toNumber(items, 2);
    const totalAmount = toNumber(amount, 249.5);
    const locale = this.intl.getCurrentLocale();
    const processedAt = new Date("2026-03-15T14:05:00.000Z");

    this.logger.info("Rendering localized express checkout page");
    await this.intl.loadNamespace("checkout");

    return view("checkout", {
      pageTitle: await this.intl.tAsync("checkout:page.title", {
        params: {
          name: customerName,
        },
      }),
      subtitle: await this.intl.tAsync("checkout:page.subtitle"),
      locale,
      summaryTitle: await this.intl.tAsync("checkout:summary.title"),
      totalText: await this.intl.tAsync("checkout:summary.total", {
        count: itemCount,
        params: {
          count: itemCount,
          amount: totalAmount,
        },
      }),
      processedText: await this.intl.tAsync("checkout:summary.processed", {
        params: {
          processedAt,
        },
      }),
      backHref: `/?${buildQuery(locale, customerName, itemCount, totalAmount)}`,
      englishHref: `/checkout?${buildQuery("en-US", customerName, itemCount, totalAmount)}`,
      spanishHref: `/checkout?${buildQuery("es-ES", customerName, itemCount, totalAmount)}`,
    });
  }
}