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
## Manifest Cache

- On first startup, xtaskjs performs a filesystem scan and creates `.xtask-manifest.json`.
- On subsequent startups, xtaskjs loads this manifest directly to speed up boot time.
- Delete `.xtask-manifest.json` to force a full rescan.
- This file is ignored in `.gitignore` for each sample.
## Parallel Load Configuration

- xtaskjs scans autoload candidates in parallel using worker threads.
- By default, it uses all available CPU parallelism.
- Use `npm run start:parallel` in this sample to run with explicit parallel configuration (`XTASK_SCAN_WORKERS=auto`).
- Optional: set `XTASK_SCAN_WORKERS=1` to force single-worker mode for debugging.
