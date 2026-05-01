# 11-scheduler_app

Node HTTP sample application using `@xtaskjs/scheduler` with xtaskjs lifecycle integration.

## Run

```bash
npm install
npm start
```

From this folder: `samples/11-scheduler_app`.

## Test URLs

- Health endpoint:
  - http://127.0.0.1:3000/health
- Scheduler status:
  - http://127.0.0.1:3000/scheduler/status
- Scheduler groups:
  - http://127.0.0.1:3000/scheduler/groups
- Trigger the maintenance group immediately:
  - http://127.0.0.1:3000/scheduler/run-maintenance

## What It Demonstrates

- `runOnBoot` for one-off bootstrap work.
- Named job groups with manual group execution.
- Retries and per-job retry/error hooks.
- Access to scheduler state through `SchedulerService`.

## Notes

- Uses the default `node-http` adapter.
- The maintenance cron intentionally fails on the first run so you can see retry hooks recorded in the status payload.
## Manifest Cache

- On first startup, xtaskjs performs a filesystem scan and creates `.xtask-manifest.json`.
- On subsequent startups, xtaskjs loads this manifest directly to speed up boot time.
- Delete `.xtask-manifest.json` to force a full rescan.
- This file is ignored in `.gitignore` for each sample.
