import { Logger } from "@xtaskjs/common";
import { Service } from "@xtaskjs/core";
import {
  Cron,
  Every,
  InjectSchedulerService,
  SchedulerJobSummary,
  SchedulerService,
  Timeout,
} from "@xtaskjs/scheduler";

@Service()
export class SchedulerDemoService {
  private heartbeatCount = 0;
  private warmupCount = 0;
  private maintenanceCount = 0;
  private cleanupFailures = 0;
  private failMaintenanceOnce = true;
  private readonly eventLog: string[] = [];

  constructor(
    private readonly logger: Logger,
    @InjectSchedulerService()
    private readonly scheduler: SchedulerService
  ) {}

  @Timeout("3s", {
    name: "sample.warmup",
    group: ["startup", "maintenance"],
    runOnBoot: true,
  })
  warmupCache() {
    this.warmupCount += 1;
    this.record(`warmup:${this.warmupCount}`);
    this.logger.info("Warmup job executed");
  }

  @Every("10s", {
    name: "sample.heartbeat",
    group: "monitoring",
    runOnInit: true,
  })
  publishHeartbeat() {
    this.heartbeatCount += 1;
    this.record(`heartbeat:${this.heartbeatCount}`);
    this.logger.info(`Heartbeat job executed (${this.heartbeatCount})`);
  }

  @Cron("*/20 * * * * *", {
    name: "sample.cleanup",
    group: "maintenance",
    maxRetries: 1,
    retryDelay: "2s",
    onRetry: "onCleanupRetry",
    onError: "onCleanupError",
  })
  runCleanup() {
    this.maintenanceCount += 1;
    this.record(`cleanup-attempt:${this.maintenanceCount}`);

    if (this.failMaintenanceOnce) {
      this.failMaintenanceOnce = false;
      this.cleanupFailures += 1;
      throw new Error("simulated cleanup failure");
    }

    this.logger.info("Cleanup job executed successfully");
  }

  onCleanupRetry(error: Error, attempt: number, context: { name: string }) {
    this.record(`retry:${context.name}:${attempt}:${error.message}`);
    this.logger.warn(`Retrying ${context.name} attempt ${attempt}: ${error.message}`);
  }

  onCleanupError(error: Error, context: { name: string }) {
    this.record(`error:${context.name}:${error.message}`);
    this.logger.error(`Job ${context.name} failed: ${error.message}`);
  }

  async runMaintenanceNow() {
    await this.scheduler.runGroup("maintenance");
    return this.getSnapshot();
  }

  getGroups(): string[] {
    return this.scheduler.listGroups();
  }

  getSnapshot() {
    return {
      counters: {
        heartbeatCount: this.heartbeatCount,
        warmupCount: this.warmupCount,
        maintenanceCount: this.maintenanceCount,
        cleanupFailures: this.cleanupFailures,
      },
      groups: this.getGroups(),
      jobs: this.scheduler.listJobs().map((job: SchedulerJobSummary) => ({
        name: job.name,
        kind: job.kind,
        groups: job.groups,
        started: job.started,
        running: job.running,
        runCount: job.runCount,
        failureCount: job.failureCount,
        bootExecuted: job.bootExecuted,
        lastError: job.lastError?.message,
      })),
      events: [...this.eventLog],
    };
  }

  private record(event: string) {
    this.eventLog.push(`${new Date().toISOString()} ${event}`);
    if (this.eventLog.length > 20) {
      this.eventLog.shift();
    }
  }
}