import "reflect-metadata";
import express from "express";
import { CreateApplication } from "@xtaskjs/core";
import { ExpressAdapter } from "@xtaskjs/express-http";
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
    home: {
      title: "Welcome {{name, uppercase}}",
      subtitle: "A localized Express page powered by xTaskJS internationalization.",
      hero:
        "Today is {{today, date, dateStyle=full}} and your featured basket total is {{amount, currency}}.",
      activity: "Your last order was {{daysAgo, relativeTime, unit=day}}.",
      cart: {
        items: {
          "=0": "Your cart is empty",
          one: "{{count, number}} item waiting in your cart",
          other: "{{count, number}} items waiting in your cart",
        },
      },
      cta: "Open localized checkout",
      localeLabel: "Current locale",
    },
  },
});

registerInternationalizationLocale({
  locale: "es-ES",
  currency: "EUR",
  timeZone: "Europe/Madrid",
  translations: {
    home: {
      title: "Bienvenida {{name, uppercase}}",
      subtitle: "Una pagina Express localizada con xTaskJS internationalization.",
      hero:
        "Hoy es {{today, date, dateStyle=full}} y el total destacado de tu cesta es {{amount, currency}}.",
      activity: "Tu ultimo pedido fue {{daysAgo, relativeTime, unit=day}}.",
      cart: {
        items: {
          "=0": "Tu cesta esta vacia",
          one: "{{count, number}} articulo esperando en tu cesta",
          other: "{{count, number}} articulos esperando en tu cesta",
        },
      },
      cta: "Abrir pago localizado",
      localeLabel: "Locale actual",
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
  const expressApp = express();
  expressApp.use(express.json());

  await CreateApplication({
    adapter: new ExpressAdapter(expressApp),
    autoListen: true,
    server: {
      host: "127.0.0.1",
      port: Number(process.env.PORT || 3000),
    },
  });
}

main().catch((error) => {
  console.error("Error starting the internationalization express sample:", error);
});