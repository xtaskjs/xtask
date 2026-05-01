# 15-fastify_http_cache_web_app

Fastify web sample application using `@xtaskjs/cache` for browser-facing HTTP cache headers and rendered views.

## Run

```bash
npm install
npm start
```

From this folder: `samples/15-fastify_http_cache_web_app`.

## Test URLs

- Home page rendered from `views/home.html` with `@CacheView`:
  - http://127.0.0.1:3000/
- Article page rendered from `views/article.html` with `@CacheView`:
  - http://127.0.0.1:3000/articles/edge-caching
- JSON route with browser cache headers:
  - http://127.0.0.1:3000/api/articles/edge-caching
- Preview page with `@NoStore()`:
  - http://127.0.0.1:3000/preview
- Health endpoint:
  - http://127.0.0.1:3000/health
- Inspect effective HTTP cache policies:
  - http://127.0.0.1:3000/ops/cache/http/routes
  - http://127.0.0.1:3000/ops/cache/http/route?method=GET&path=/articles/:slug

## What It Demonstrates

- `configureCache({ httpCacheDefaults })` for centralized browser-cache defaults.
- `@CacheView()` for HTML pages rendered with `view(...)`.
- `@BrowserCache()` for JSON endpoints.
- `@NoStore()` for preview pages that must never be cached.
- `createCacheManagementController()` to inspect registered HTTP cache routes.
- The same browser-cache behavior as the Express sample, but on the Fastify adapter.

## Quick Checks

Inspect the headers for the home page:

```bash
curl -i http://127.0.0.1:3000/
```

Revalidate using the returned `ETag`:

```bash
curl -i http://127.0.0.1:3000/ -H 'If-None-Match: W/"replace-with-etag"'
```

Check that the preview route disables browser caching:

```bash
curl -i http://127.0.0.1:3000/preview
```

## Notes

- Static assets are served from `public/` by default.
- Templates are loaded from `views/` by default.
- The sample keeps the page content stable so repeated requests make the cache headers easier to inspect.
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
