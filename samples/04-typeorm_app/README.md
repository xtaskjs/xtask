# 04-typeorm_app

Fastify sample application using `@xtaskjs/core` + `@xtaskjs/fastify-http` + `@xtaskjs/typeorm` with SQLite.

## Run

```bash
npm install
npm start
```

From this folder: `samples/04-typeorm_app`.

## Test URLs

- List users:
  - http://127.0.0.1:3000/users/
- Seed one user:
  - `POST` http://127.0.0.1:3000/users/seed
- Health endpoint:
  - http://127.0.0.1:3000/health/

## Notes

- SQLite file defaults to `samples/04-typeorm_app/xtask-typeorm.sqlite`.
- Set `DB_PATH` to customize DB location.
