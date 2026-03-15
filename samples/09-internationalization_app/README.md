# 09-internationalization_app

Node HTTP sample application using `@xtaskjs/internationalization`.

## Run

```bash
npm install
npm start
```

From this folder: `samples/09-internationalization_app`.

## Test URLs

- Health endpoint:
  - http://127.0.0.1:3000/health
- Internationalization overview with default locale:
  - http://127.0.0.1:3000/i18n
- Spanish locale via query string:
  - http://127.0.0.1:3000/i18n?locale=es-ES&name=ada&items=3&amount=1499.95
- Namespace-loaded checkout summary:
  - http://127.0.0.1:3000/i18n/checkout?locale=en-US&items=2&amount=249.5

## Notes

- Locale can be resolved from `?locale=...` or `Accept-Language`.
- The sample demonstrates:
  - request-scoped locale and currency resolution
  - built-in template helpers for number, currency, date, and datetime
  - custom formatters (`uppercase`, `relativeTime`)
  - lazy namespace loading for checkout translations