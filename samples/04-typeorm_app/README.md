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
