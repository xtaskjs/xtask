import "reflect-metadata";
import { beforeEach, afterEach, describe, expect, test } from "@jest/globals";
import { Container, Service } from "@xtaskjs/core";
import {
  InjectInternationalizationLifecycleManager,
  InjectInternationalizationService,
  InternationalizationLifecycleManager,
  InternationalizationService,
  clearInternationalizationConfiguration,
  clearRegisteredInternationalizationFormatters,
  clearRegisteredInternationalizationNamespaceLoaders,
  clearRegisteredInternationalizationLocaleResolvers,
  clearRegisteredInternationalizationLocales,
  configureInternationalization,
  getInternationalizationLifecycleToken,
  getInternationalizationServiceToken,
  initializeInternationalizationIntegration,
  registerInternationalizationFormatter,
  registerInternationalizationLocale,
  registerInternationalizationLocaleResolver,
  registerInternationalizationNamespaceLoader,
  runWithInternationalizationContext,
  shutdownInternationalizationIntegration,
} from "../src";

describe("@xtaskjs/internationalization integration", () => {
  beforeEach(async () => {
    clearInternationalizationConfiguration();
    clearRegisteredInternationalizationFormatters();
    clearRegisteredInternationalizationNamespaceLoaders();
    clearRegisteredInternationalizationLocaleResolvers();
    clearRegisteredInternationalizationLocales();
    await shutdownInternationalizationIntegration();
  });

  afterEach(async () => {
    clearInternationalizationConfiguration();
    clearRegisteredInternationalizationFormatters();
    clearRegisteredInternationalizationNamespaceLoaders();
    clearRegisteredInternationalizationLocaleResolvers();
    clearRegisteredInternationalizationLocales();
    await shutdownInternationalizationIntegration();
  });

  test("registers the service in the container and resolves locale from the request", async () => {
    configureInternationalization({
      defaultLocale: "en-US",
      fallbackLocale: "en-US",
      defaultCurrency: "USD",
      defaultTimeZone: "UTC",
    });
    registerInternationalizationLocale({
      locale: "en-US",
      currency: "USD",
      timeZone: "UTC",
      translations: {
        checkout: {
          title: "Checkout",
          total: "Total: {{amount}}",
        },
      },
    });
    registerInternationalizationLocale({
      locale: "es-ES",
      currency: "EUR",
      timeZone: "Europe/Madrid",
      translations: {
        checkout: {
          title: "Caja",
          total: "Total: {{amount}}",
        },
      },
    });

    const container = new Container();
    await initializeInternationalizationIntegration(container);

    @Service()
    class CheckoutPresenter {
      constructor(
        @InjectInternationalizationService()
        public readonly intl: InternationalizationService
      ) {}
    }

    container.register(CheckoutPresenter, { scope: "singleton" });
    const presenter = container.get(CheckoutPresenter);
    const serviceByName = container.getByName<InternationalizationService>(
      getInternationalizationServiceToken()
    );

    await runWithInternationalizationContext(
      {
        headers: {
          "accept-language": "es-ES,es;q=0.9,en;q=0.8",
        },
      },
      async () => {
        expect(presenter.intl).toBeInstanceOf(InternationalizationService);
        expect(serviceByName.t("checkout.title")).toBe("Caja");

        const formattedCurrency = serviceByName.formatCurrency(1234.5);
        const formattedDate = serviceByName.formatDate("2026-03-15T10:30:00.000Z");

        expect(formattedCurrency).toBe(
          new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(1234.5)
        );
        expect(formattedDate).toBe(
          new Intl.DateTimeFormat("es-ES", {
            dateStyle: "medium",
            timeZone: "Europe/Madrid",
          }).format(new Date("2026-03-15T10:30:00.000Z"))
        );
        expect(serviceByName.t("checkout.total", { params: { amount: formattedCurrency } })).toBe(
          `Total: ${formattedCurrency}`
        );
      }
    );
  });

  test("supports pluralization rules and exact-count messages", async () => {
    configureInternationalization({
      defaultLocale: "en-US",
      fallbackLocale: "en-US",
    });
    registerInternationalizationLocale({
      locale: "en-US",
      translations: {
        inbox: {
          messages: {
            "=0": "No messages",
            one: "{{count}} message",
            other: "{{count}} messages",
          },
        },
      },
    });

    const container = new Container();
    await initializeInternationalizationIntegration(container);
    const service = container.getByName<InternationalizationService>(getInternationalizationServiceToken());

    expect(service.t("inbox.messages", { count: 0 })).toBe("No messages");
    expect(service.t("inbox.messages", { count: 1 })).toBe("1 message");
    expect(service.t("inbox.messages", { count: 4 })).toBe("4 messages");
  });

  test("supports custom interpolation formatters", async () => {
    configureInternationalization({
      defaultLocale: "en-US",
      fallbackLocale: "en-US",
    });
    registerInternationalizationFormatter("uppercase", ({ value }) => {
      return String(value).toUpperCase();
    });
    registerInternationalizationFormatter("relativeTime", ({ value, locale, options }) => {
      const numericValue = Number(value);
      const unit = String(options.unit || "day") as Intl.RelativeTimeFormatUnit;
      return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(numericValue, unit);
    });
    registerInternationalizationLocale({
      locale: "en-US",
      translations: {
        account: {
          badge: "User {{name, uppercase}} signed in {{daysAgo, relativeTime, unit=day}}.",
        },
      },
    });

    const container = new Container();
    await initializeInternationalizationIntegration(container);
    const service = container.getByName<InternationalizationService>(getInternationalizationServiceToken());

    expect(
      service.t("account.badge", {
        params: {
          name: "ada",
          daysAgo: -1,
        },
      })
    ).toBe("User ADA signed in yesterday.");
  });

  test("formats numbers and dates inside translation templates", async () => {
    configureInternationalization({
      defaultLocale: "en-US",
      fallbackLocale: "en-US",
      defaultCurrency: "USD",
      defaultTimeZone: "UTC",
    });
    registerInternationalizationLocale({
      locale: "en-US",
      translations: {
        invoice: {
          summary:
            "Total {{amount, currency}} for {{quantity, number}} items on {{issuedAt, date, dateStyle=long}} at {{processedAt, datetime, dateStyle=short, timeStyle=short, timeZone=UTC}}",
          customCurrency: "Paid {{amount, currency, currency=EUR}}",
        },
      },
    });

    const container = new Container();
    await initializeInternationalizationIntegration(container);
    const service = container.getByName<InternationalizationService>(getInternationalizationServiceToken());

    const issuedAt = new Date("2026-03-15T10:30:00.000Z");
    const processedAt = new Date("2026-03-15T14:05:00.000Z");

    expect(
      service.t("invoice.summary", {
        params: {
          amount: 1234.5,
          quantity: 3,
          issuedAt,
          processedAt,
        },
      })
    ).toBe(
      `Total ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(1234.5)} for ${new Intl.NumberFormat("en-US").format(3)} items on ${new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(issuedAt)} at ${new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(processedAt)}`
    );

    expect(
      service.t("invoice.customCurrency", {
        params: {
          amount: 1234.5,
        },
      })
    ).toBe(`Paid ${new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(1234.5)}`);
  });

  test("loads namespaces asynchronously per locale", async () => {
    configureInternationalization({
      defaultLocale: "en-US",
      fallbackLocale: "en-US",
    });
    registerInternationalizationLocale({
      locale: "en-US",
      translations: {
        common: {
          ready: "Ready",
        },
      },
    });
    registerInternationalizationLocale({
      locale: "es-ES",
      translations: {
        common: {
          ready: "Listo",
        },
      },
    });
    registerInternationalizationNamespaceLoader("checkout", async ({ locale }) => {
      if (locale === "es-ES") {
        return {
          summary: {
            total: "Total de compra: {{count}} artículos",
          },
        };
      }

      return {
        summary: {
          total: {
            one: "Checkout total: {{count}} item",
            other: "Checkout total: {{count}} items",
          },
        },
      };
    });

    const container = new Container();
    await initializeInternationalizationIntegration(container);
    const service = container.getByName<InternationalizationService>(getInternationalizationServiceToken());

    await runWithInternationalizationContext(
      {
        headers: {
          "accept-language": "es-ES",
        },
      },
      async () => {
        expect(await service.loadNamespace("checkout")).toBe(true);
        expect(service.listNamespaces()).toContain("checkout");
        expect(await service.tAsync("checkout:summary.total", { count: 3 })).toBe(
          "Total de compra: 3 artículos"
        );
      }
    );

    expect(await service.tAsync("checkout:summary.total", { locale: "en-US", count: 1 })).toBe(
      "Checkout total: 1 item"
    );
    expect(await service.tAsync("checkout:summary.total", { locale: "en-US", count: 5 })).toBe(
      "Checkout total: 5 items"
    );
  });

  test("supports custom resolvers and lifecycle manager injection", async () => {
    configureInternationalization({
      defaultLocale: "en-US",
      fallbackLocale: "en-US",
      defaultCurrency: "USD",
    });
    registerInternationalizationLocale({
      locale: "en-US",
      currency: "USD",
      translations: {
        greeting: "Hello",
      },
    });
    registerInternationalizationLocale({
      locale: "fr-FR",
      currency: "EUR",
      timeZone: "Europe/Paris",
      translations: {
        greeting: "Bonjour",
      },
    });
    registerInternationalizationLocaleResolver(({ request, container }) => {
      if (!request?.tenant || !container) {
        return undefined;
      }

      return container.getByName<{ locale: string; currency: string; timeZone: string }>(
        "tenant:locale"
      );
    });

    const container = new Container();
    container.registerNamedInstance("tenant:locale", {
      locale: "fr-FR",
      currency: "EUR",
      timeZone: "Europe/Paris",
    });

    await initializeInternationalizationIntegration(container);

    @Service()
    class LocalizedService {
      constructor(
        @InjectInternationalizationService()
        public readonly intl: InternationalizationService,
        @InjectInternationalizationLifecycleManager()
        public readonly lifecycle: InternationalizationLifecycleManager
      ) {}
    }

    container.register(LocalizedService, { scope: "singleton" });
    const localizedService = container.get(LocalizedService);
    const lifecycleByName = container.getByName<InternationalizationLifecycleManager>(
      getInternationalizationLifecycleToken()
    );

    await runWithInternationalizationContext(
      {
        tenant: true,
      },
      async () => {
        expect(localizedService.intl.t("greeting")).toBe("Bonjour");
        expect(localizedService.lifecycle).toBe(lifecycleByName);
        expect(lifecycleByName.listLocales()).toEqual(["en-US", "fr-FR"]);
        expect(localizedService.intl.getCurrentLocale()).toBe("fr-FR");
      }
    );
  });
});