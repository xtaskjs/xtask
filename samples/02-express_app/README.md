# 02-express_app

Express sample application using `@xtaskjs/core` + `@xtaskjs/express-http`.

## Run

```bash
npm install
npm start
```

From this folder: `samples/02-express_app`.

## Test URLs

- Home page (view from `views/home.html`):
  - http://127.0.0.1:3000/
- Health endpoint (JSON):
  - http://127.0.0.1:3000/health

## Notes

- Static assets are served from `public/` by default.
- Templates are loaded from `views/` by default.

## Manifest Cache

- On first startup, xtaskjs performs a filesystem scan and creates `.xtask-manifest.json`.
- On subsequent startups, xtaskjs loads this manifest directly to speed up boot time.
- Delete `.xtask-manifest.json` to force a full rescan.
- This file is ignored in `.gitignore` for each sample.
