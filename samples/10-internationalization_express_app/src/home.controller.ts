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

@Controller("/")
export class HomeController {
  constructor(
    private readonly logger: Logger,
    @InjectInternationalizationService()
    private readonly intl: InternationalizationService
  ) {}

  @Get("/")
  home(
    @Query("name") name?: string,
    @Query("items") items?: string,
    @Query("amount") amount?: string
  ) {
    const customerName = name || "guest";
    const itemCount = toNumber(items, 3);
    const totalAmount = toNumber(amount, 1499.95);
    const locale = this.intl.getCurrentLocale();
    const today = new Date("2026-03-15T10:30:00.000Z");

    this.logger.info("Rendering localized express home page");

    return view("home", {
      pageTitle: this.intl.t("home.title", {
        params: {
          name: customerName,
        },
      }),
      subtitle: this.intl.t("home.subtitle"),
      localeLabel: this.intl.t("home.localeLabel"),
      locale,
      hero: this.intl.t("home.hero", {
        params: {
          today,
          amount: totalAmount,
        },
      }),
      activity: this.intl.t("home.activity", {
        params: {
          daysAgo: -1,
        },
      }),
      cartSummary: this.intl.t("home.cart.items", {
        count: itemCount,
      }),
      checkoutCta: this.intl.t("home.cta"),
      checkoutHref: `/checkout?${buildQuery(locale, customerName, itemCount, totalAmount)}`,
      englishHref: `/?${buildQuery("en-US", customerName, itemCount, totalAmount)}`,
      spanishHref: `/?${buildQuery("es-ES", customerName, itemCount, totalAmount)}`,
      healthHref: "/health/",
    });
  }
}