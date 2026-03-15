# @xtaskjs/internationalization

Internationalization integration package for xtaskjs.

## Installation
```bash
npm install @xtaskjs/internationalization reflect-metadata
```

## What It Provides
- Request-aware translations with locale fallback.
- Pluralization with `Intl.PluralRules`, including exact-count matches like `=0`.
- Async namespace loading for feature-specific translation bundles.
- Currency and date formatting using the active locale, currency, and timezone.
- Container tokens and decorators for injecting the internationalization service or lifecycle manager.
- Lifecycle integration so locale services are ready before controllers and services are instantiated.

## Register Configuration And Locales
```typescript
import {
  configureInternationalization,
  registerInternationalizationLocale,
} from "@xtaskjs/internationalization";

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
      total: "Total: {{amount}}",
    },
  },
});
```

## Inject And Use The Service
```typescript
import { Service } from "@xtaskjs/core";
import {
  InjectInternationalizationService,
  InternationalizationService,
} from "@xtaskjs/internationalization";

@Service()
class CheckoutPresenter {
  constructor(
    @InjectInternationalizationService()
    private readonly intl: InternationalizationService
  ) {}

  presentTotal(total: number) {
    return this.intl.t("checkout.total", {
      params: {
        amount: this.intl.formatCurrency(total),
      },
    });
  }
}
```

## Template Formatting Helpers
Translation templates can format numbers, currencies, dates, and datetimes inline.

```typescript
registerInternationalizationLocale({
  locale: "en-US",
  translations: {
    invoice: {
      summary:
        "Total {{amount, currency}} for {{quantity, number}} items on {{issuedAt, date, dateStyle=long}}",
    },
  },
});

intl.t("invoice.summary", {
  params: {
    amount: 1234.5,
    quantity: 3,
    issuedAt: new Date(),
  },
});
```

Supported helpers:
- `{{ value, number }}`
- `{{ value, currency }}`
- `{{ value, date }}`
- `{{ value, datetime }}`

Helper options use `key=value` pairs, for example `{{ amount, currency, currency=EUR }}` or `{{ createdAt, datetime, timeZone=UTC, timeStyle=short }}`.

## Custom Formatters
Applications can register their own interpolation helpers for domain-specific formatting.

```typescript
import { registerInternationalizationFormatter } from "@xtaskjs/internationalization";

registerInternationalizationFormatter("uppercase", ({ value }) => {
  return String(value).toUpperCase();
});

registerInternationalizationFormatter("relativeTime", ({ value, locale, options }) => {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    Number(value),
    options.unit || "day"
  );
});

registerInternationalizationLocale({
  locale: "en-US",
  translations: {
    activity: {
      summary: "{{name, uppercase}} was active {{daysAgo, relativeTime, unit=day}}",
    },
  },
});
```

## Pluralization
Plural messages can use CLDR categories and exact-count keys.

```typescript
registerInternationalizationLocale({
  locale: "en-US",
  translations: {
    cart: {
      items: {
        "=0": "Your cart is empty",
        one: "{{count}} item",
        other: "{{count}} items",
      },
    },
  },
});

intl.t("cart.items", { count: 0 });
intl.t("cart.items", { count: 1 });
intl.t("cart.items", { count: 3 });
```

## Namespace Loading
Use namespaces when translations should be split by feature and loaded lazily.

```typescript
import { registerInternationalizationNamespaceLoader } from "@xtaskjs/internationalization";

registerInternationalizationNamespaceLoader("checkout", async ({ locale }) => {
  const module = await import(`./i18n/${locale}/checkout`);
  return module.default;
});

await intl.loadNamespace("checkout");
await intl.tAsync("checkout:summary.total", { count: 2 });
```

## Custom Locale Resolution
The package ships with built-in request resolution from `locale`/`lang` query parameters, `x-locale`, `content-language`, and `accept-language` headers. You can extend that with custom resolvers.

```typescript
import { registerInternationalizationLocaleResolver } from "@xtaskjs/internationalization";

registerInternationalizationLocaleResolver(({ request, container }) => {
  if (!request?.tenantId || !container) {
    return undefined;
  }

  return container.getByName(`tenant-locale:${request.tenantId}`);
});
```

## Lifecycle Behavior
- During `CreateApplication()`: the package initializes before container lifecycle listeners are resolved.
- During `app.close()`: request context support is shut down before the DI container is destroyed.