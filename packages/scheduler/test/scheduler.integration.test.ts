import { describe, expect, test, beforeEach, afterEach, jest } from "@jest/globals";
import { Container, Service } from "@xtaskjs/core";
import { ApplicationLifeCycle } from "@xtaskjs/core";
import {
  Cron,
  Every,
  getSchedulerServiceToken,
  Interval,
  resetSchedulerIntegration,
  SchedulerService,
  Timeout,
  initializeSchedulerIntegration,
} from "../src";

@Service()
class IntervalWorker {
  public ticks = 0;

  @Every("50ms", { name: "worker.tick" })
  runTick() {
    this.ticks += 1;
  }
}

@Service()
class MixedWorker {
  public cronRuns = 0;
  public timeoutRuns = 0;

  @Cron("*/5 * * * * *", { name: "worker.cron" })
  runCron() {
    this.cronRuns += 1;
  }

  @Timeout("25ms", { name: "worker.timeout" })
  runTimeout() {
    this.timeoutRuns += 1;
  }
}

@Service()
class AdvancedWorker {
  public bootRuns = 0;
  public retryRuns = 0;
  public failingRuns = 0;
  public events: string[] = [];

  @Interval("1h", {
    name: "advanced.boot",
    group: ["maintenance", "boot"],
    runOnBoot: true,
  })
  runBootJob() {
    this.bootRuns += 1;
    this.events.push("boot");
  }

  @Every("1h", {
    name: "advanced.retry",
    group: "ops",
    maxRetries: 2,
    retryDelay: "10ms",
    onRetry: "onRetryHook",
  })
  runEventually() {
    this.retryRuns += 1;
    if (this.retryRuns < 3) {
      throw new Error(`retry-${this.retryRuns}`);
    }
    this.events.push("retry-success");
  }

  @Timeout("1h", {
    name: "advanced.fail",
    group: "ops",
    maxRetries: 1,
    retryDelay: "5ms",
    onRetry: "onRetryHook",
    onError: "onErrorHook",
  })
  alwaysFail() {
    this.failingRuns += 1;
    throw new Error("fatal");
  }

  onRetryHook(error: Error, attempt: number, context: { name: string }) {
    this.events.push(`retry:${context.name}:${attempt}:${error.message}`);
  }

  onErrorHook(error: Error, context: { name: string }) {
    this.events.push(`error:${context.name}:${error.message}`);
  }
}

describe("scheduler integration", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await resetSchedulerIntegration();
  });

  afterEach(async () => {
    await resetSchedulerIntegration();
    jest.useRealTimers();
  });

  test("starts and stops interval jobs with lifecycle events", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();
    container.register(IntervalWorker, { scope: "singleton" });

    await initializeSchedulerIntegration(container, lifecycle);

    const scheduler = container.getByName<SchedulerService>(getSchedulerServiceToken());
    const worker = container.get(IntervalWorker);

    expect(scheduler.listJobs().map((job) => job.name)).toContain("worker.tick");

    await jest.advanceTimersByTimeAsync(200);
    expect(worker.ticks).toBe(0);

    await lifecycle.emit("ready");
    await jest.advanceTimersByTimeAsync(160);
    expect(worker.ticks).toBeGreaterThanOrEqual(3);
    expect(scheduler.isStarted()).toBe(true);

    const snapshot = worker.ticks;
    await lifecycle.emit("stopping");
    await jest.advanceTimersByTimeAsync(160);
    expect(worker.ticks).toBe(snapshot);
    expect(scheduler.isStarted()).toBe(false);
  });

  test("discovers cron and timeout jobs and allows manual execution", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();
    container.register(MixedWorker, { scope: "singleton" });

    await initializeSchedulerIntegration(container, lifecycle);

    const scheduler = container.getByName<SchedulerService>(getSchedulerServiceToken());
    const worker = container.get(MixedWorker);

    expect(scheduler.listJobs().map((job) => job.name).sort()).toEqual([
      "worker.cron",
      "worker.timeout",
    ]);

    await scheduler.runJob("worker.cron");
    expect(worker.cronRuns).toBe(1);

    await lifecycle.emit("ready");
    await jest.advanceTimersByTimeAsync(30);
    expect(worker.timeoutRuns).toBe(1);
  });

  test("supports boot runs, groups, retries, and error hooks", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();
    container.register(AdvancedWorker, { scope: "singleton" });

    await initializeSchedulerIntegration(container, lifecycle);

    const scheduler = container.getByName<SchedulerService>(getSchedulerServiceToken());
    const worker = container.get(AdvancedWorker);

    expect(worker.bootRuns).toBe(1);
    expect(scheduler.listGroups()).toEqual(["boot", "maintenance", "ops"]);
    expect(scheduler.listJobs("maintenance").map((job) => job.name)).toEqual(["advanced.boot"]);

    const retryRun = expect(scheduler.runGroup("ops")).rejects.toThrow("fatal");
    await jest.advanceTimersByTimeAsync(10);
    await jest.advanceTimersByTimeAsync(10);
    await jest.advanceTimersByTimeAsync(5);
    await retryRun;

    expect(worker.retryRuns).toBe(3);
    expect(worker.failingRuns).toBe(2);
    expect(worker.events).toEqual([
      "boot",
      "retry:advanced.retry:1:retry-1",
      "retry:advanced.retry:2:retry-2",
      "retry-success",
      "retry:advanced.fail:1:fatal",
      "error:advanced.fail:fatal",
    ]);

    const bootJob = scheduler.listJobs("boot")[0];
    expect(bootJob.bootExecuted).toBe(true);
    expect(bootJob.runOnBoot).toBe(true);
  });
});