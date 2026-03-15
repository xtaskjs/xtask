import "reflect-metadata";
import { CreateApplication } from "@xtaskjs/core";
import {
  configureInternationalization,
  registerInternationalizationFormatter,
  registerInternationalizationLocale,
  registerInternationalizationNamespaceLoader,
} from "@xtaskjs/internationalization";

configureInternationalization({
  defaultLocale: "en-US",
  fallbackLocale: "en-US",
  defaultCurrency: "USD",
  defaultTimeZone: "UTC",
});

registerInternationalizationFormatter("uppercase", ({ value }) => {
  return String(value || "").toUpperCase();
});

registerInternationalizationFormatter("relativeTime", ({ value, locale, options }) => {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    Number(value),
    String(options.unit || "day") as Intl.RelativeTimeFormatUnit
  );
});

registerInternationalizationLocale({
  locale: "en-US",
  currency: "USD",
  timeZone: "UTC",
  translations: {
    landing: {
      title: "Welcome {{name, uppercase}}",
      summary:
        "Today is {{today, date, dateStyle=long}} and your basket total is {{amount, currency}}.",
      activity: "Your last order was {{daysAgo, relativeTime, unit=day}}.",
      cart: {
        items: {
          "=0": "Your cart is empty",
          one: "{{count, number}} item in your cart",
          other: "{{count, number}} items in your cart",
        },
      },
    },
  },
});

registerInternationalizationLocale({
  locale: "es-ES",
  currency: "EUR",
  timeZone: "Europe/Madrid",
  translations: {
    landing: {
      title: "Bienvenida {{name, uppercase}}",
      summary:
        "Hoy es {{today, date, dateStyle=long}} y el total de tu cesta es {{amount, currency}}.",
      activity: "Tu ultimo pedido fue {{daysAgo, relativeTime, unit=day}}.",
      cart: {
        items: {
          "=0": "Tu cesta esta vacia",
          one: "{{count, number}} articulo en tu cesta",
          other: "{{count, number}} articulos en tu cesta",
        },
      },
    },
  },
});

registerInternationalizationNamespaceLoader("checkout", async ({ locale }) => {
  if (locale === "es-ES") {
    const module = await import("./i18n/es-ES/checkout");
    return module.default;
  }

  const module = await import("./i18n/en-US/checkout");
  return module.default;
});

async function main() {
  await CreateApplication({
    adapter: "node-http",
    autoListen: true,
    server: {
      host: "127.0.0.1",
      port: Number(process.env.PORT || 3000),
    },
  });
}

main().catch((error) => {
  console.error("Error starting the application:", error);
});