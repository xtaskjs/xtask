# 03-fastify_app

Fastify sample application using `@xtaskjs/core` + `@xtaskjs/fastify-http`.

## Run

```bash
npm install
npm start
```

From this folder: `samples/03-fastify_app`.

## Test URLs

- Home page (view from `views/home.html`):
  - http://127.0.0.1:3000/
- Health endpoint (JSON):
  - http://127.0.0.1:3000/health

## Notes

- Static assets are served from `public/` by default.
- Templates are loaded from `views/` by default.
