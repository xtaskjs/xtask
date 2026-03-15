# 10-internationalization_express_app

Express sample application using `@xtaskjs/internationalization` with localized pages.

## Run

```bash
npm install
npm start
```

From this folder: `samples/10-internationalization_express_app`.

## Test URLs

- Home page in English:
  - http://127.0.0.1:3000/?locale=en-US&name=ada&items=3&amount=1499.95
- Home page in Spanish:
  - http://127.0.0.1:3000/?locale=es-ES&name=ada&items=3&amount=1499.95
- Checkout page with lazy namespace loading:
  - http://127.0.0.1:3000/checkout?locale=es-ES&name=ada&items=2&amount=249.5
- Health endpoint:
  - http://127.0.0.1:3000/health

## What It Shows

- `@xtaskjs/internationalization` injected into Express-backed controllers.
- Localized page rendering with `view()` and the default Express adapter template handling.
- Query-driven locale changes plus `Accept-Language` request support.
- Built-in interpolation helpers for number, currency, date, and datetime.
- Custom formatters (`uppercase`, `relativeTime`).
- Lazy namespace loading for the checkout page.

## Notes

- Static assets are served from `public/` by default.
- Templates are loaded from `views/` by default.
- Try switching `locale` between `en-US` and `es-ES` to see localized content and formatting changes.