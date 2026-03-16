# @xtaskjs/scheduler

Scheduler integration package for xtaskjs.

## Installation
```bash
npm install @xtaskjs/scheduler node-cron reflect-metadata
```

## What It Provides
- Cron-style decorators for declaring scheduled methods on xtaskjs services.
- Interval and timeout decorators when a fixed delay is simpler than a cron expression.
- Boot-time execution, named groups, and per-job retry or error hooks.
- Lifecycle integration so jobs start on `ready` and stop on `app.close()`.
- Container tokens and decorators for injecting the scheduler service or lifecycle manager.

## Declare Scheduled Jobs
```typescript
import { Service } from "@xtaskjs/core";
import { Cron, Every, Timeout } from "@xtaskjs/scheduler";

@Service()
class ReportsScheduler {
  @Cron("0 */5 * * * *", {
    name: "reports.flush",
    timeZone: "UTC",
    group: ["reports", "nightly"],
    runOnBoot: true,
    maxRetries: 2,
    retryDelay: "15s",
    onError: "handleFlushError",
  })
  async flushReports() {
    console.log("flush pending reports");
  }

  @Every("10m", { name: "reports.compact" })
  compactCache() {
    console.log("compact cache every ten minutes");
  }

  @Timeout("30s", { name: "reports.warmup" })
  warmup() {
    console.log("run once after startup");
  }

  handleFlushError(error: Error) {
    console.error("report flush failed", error);
  }
}
```

## Inject The Scheduler Service
```typescript
import { Service } from "@xtaskjs/core";
import { InjectSchedulerService, SchedulerService } from "@xtaskjs/scheduler";

@Service()
class SchedulerInspector {
  constructor(
    @InjectSchedulerService()
    private readonly scheduler: SchedulerService
  ) {}

  printJobs() {
    return this.scheduler.listJobs();
  }

  printReportJobs() {
    return this.scheduler.listJobs("reports");
  }

  async runNow(name: string) {
    await this.scheduler.runJob(name);
  }

  async rerunOpsGroup() {
    await this.scheduler.runGroup("ops");
  }
}
```

## Decorators
- `@Cron(expression, options)` registers a cron expression using `node-cron`.
- `@Every(interval, options)` registers a recurring interval. Examples: `5000`, `"15s"`, `"10m"`, `"1h"`.
- `@Interval(interval, options)` is an alias for `@Every`.
- `@Timeout(delay, options)` runs a method once after startup.

## Options
- `name`: stable job name. Defaults to `ClassName.methodName`.
- `disabled`: keep the job registered but do not start it automatically.
- `group`: assign one or more named groups for bulk operations like `runGroup("ops")`.
- `runOnBoot`: run the job once during application bootstrap, before lifecycle `ready`.
- `runOnInit`: run immediately when the scheduler starts, then continue on the normal cadence.
- `allowOverlap`: allow a new execution while the previous one is still running.
- `maxRetries`: retry a failed execution this many times before surfacing the final error.
- `retryDelay`: wait between retries. Examples: `250`, `"5s"`, `"2m"`.
- `onRetry`: callback or instance method name invoked before each retry.
- `onError`: callback or instance method name invoked after the final failed attempt.
- `timeZone`: cron timezone override.

## Group Operations
`SchedulerService` supports bulk operations per group.

```typescript
await scheduler.startGroup("reports");
await scheduler.stopGroup("reports");
await scheduler.runGroup("reports");

const groups = scheduler.listGroups();
const reportJobs = scheduler.listJobs("reports");
```

## Lifecycle Behavior
- During `CreateApplication()`: scheduled jobs are discovered after the DI container is ready.
- Jobs with `runOnBoot` execute once during integration initialization.
- On lifecycle `ready`: recurring and delayed jobs start automatically.
- During `app.close()`: all running jobs are stopped before the container is destroyed.