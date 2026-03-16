import cron from "node-cron";
import { ApplicationLifeCycle, Container } from "@xtaskjs/core";
import { getSchedulerConfiguration, resetSchedulerConfiguration } from "./configuration";
import { getScheduledMethodMetadata } from "./metadata";
import { SchedulerService } from "./scheduler.service";
import { getSchedulerLifecycleToken, getSchedulerServiceToken } from "./tokens";
import {
  ScheduledMethodMetadata,
  SchedulerJobContext,
  SchedulerJobErrorHandler,
  SchedulerJobRetryHandler,
  SchedulerJobSummary,
} from "./types";

type CronTaskHandle = {
  stop?: () => void;
  destroy?: () => void;
};

type ActiveHandle =
  | { kind: "cron"; handle: CronTaskHandle }
  | { kind: "interval"; handle: NodeJS.Timeout }
  | { kind: "timeout"; handle: NodeJS.Timeout };

interface DiscoveredJob {
  name: string;
  kind: ScheduledMethodMetadata["kind"];
  expression?: string;
  intervalMs?: number;
  delayMs?: number;
  methodName: string;
  targetName: string;
  groups: string[];
  disabled: boolean;
  allowOverlap: boolean;
  runOnBoot: boolean;
  runOnInit: boolean;
  maxRetries: number;
  retryDelayMs: number;
  timeZone?: string;
  onError?: SchedulerJobErrorHandler | string;
  onRetry?: SchedulerJobRetryHandler | string;
  instance: any;
  invoke: () => any | Promise<any>;
  runCount: number;
  failureCount: number;
  bootExecuted: boolean;
  lastRunAt?: Date;
  lastFinishedAt?: Date;
  lastError?: Error;
  running: boolean;
}

const wait = async (durationMs: number): Promise<void> => {
  if (durationMs <= 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

const normalizeJobName = (
  targetName: string,
  methodName: string,
  metadata: ScheduledMethodMetadata
): string => {
  const configuredName = metadata.name || metadata.options.name;
  return configuredName && configuredName.trim().length > 0
    ? configuredName.trim()
    : `${targetName}.${methodName}`;
};

export class SchedulerLifecycleManager {
  private readonly jobs = new Map<string, DiscoveredJob>();
  private readonly activeHandles = new Map<string, ActiveHandle>();
  private container?: Container;
  private lifecycle?: ApplicationLifeCycle;
  private started = false;

  async initialize(container?: Container, lifecycle?: ApplicationLifeCycle): Promise<void> {
    await this.stopAll();
    this.jobs.clear();
    this.activeHandles.clear();
    this.container = container;
    this.lifecycle = lifecycle;

    this.registerContainerBindings(container);
    this.discoverJobs(container);

    if (lifecycle && typeof (lifecycle as any).on === "function") {
      lifecycle.on("ready", async () => {
        if (getSchedulerConfiguration().autoStart) {
          await this.startAll();
        }
      });

      lifecycle.on("stopping", async () => {
        await this.stopAll();
      });
    }
  }

  async destroy(): Promise<void> {
    await this.stopAll();
    this.jobs.clear();
    this.container = undefined;
    this.lifecycle = undefined;
    this.started = false;
  }

  getContainer(): Container | undefined {
    return this.container;
  }

  isStarted(): boolean {
    return this.started;
  }

  listJobs(group?: string): SchedulerJobSummary[] {
    const normalizedGroup = group?.trim();
    return Array.from(this.jobs.values())
      .filter((job) => !normalizedGroup || job.groups.includes(normalizedGroup))
      .map((job) => ({
      name: job.name,
      kind: job.kind,
      methodName: job.methodName,
      targetName: job.targetName,
      groups: [...job.groups],
      expression: job.expression,
      intervalMs: job.intervalMs,
      delayMs: job.delayMs,
      disabled: job.disabled,
      started: this.activeHandles.has(job.name),
      running: job.running,
      runOnBoot: job.runOnBoot,
      runOnInit: job.runOnInit,
      maxRetries: job.maxRetries,
      retryDelayMs: job.retryDelayMs,
      failureCount: job.failureCount,
      bootExecuted: job.bootExecuted,
      runCount: job.runCount,
      lastRunAt: job.lastRunAt,
      lastFinishedAt: job.lastFinishedAt,
      lastError: job.lastError,
    }));
  }

  listGroups(): string[] {
    return Array.from(
      new Set(Array.from(this.jobs.values()).flatMap((job) => job.groups))
    ).sort();
  }

  async startAll(): Promise<void> {
    for (const job of this.jobs.values()) {
      if (job.disabled) {
        continue;
      }
      await this.startJob(job.name);
    }
    this.syncStartedState();
  }

  async stopAll(): Promise<void> {
    for (const jobName of Array.from(this.activeHandles.keys())) {
      await this.stopJob(jobName);
    }
    this.syncStartedState();
  }

  async startGroup(group: string): Promise<void> {
    for (const job of this.getJobsByGroup(group)) {
      if (!job.disabled) {
        await this.startJob(job.name);
      }
    }
    this.syncStartedState();
  }

  async stopGroup(group: string): Promise<void> {
    for (const job of this.getJobsByGroup(group)) {
      await this.stopJob(job.name);
    }
    this.syncStartedState();
  }

  async runGroup(group: string): Promise<void> {
    for (const job of this.getJobsByGroup(group)) {
      await this.runJob(job.name);
    }
  }

  async startJob(name: string): Promise<void> {
    const job = this.getJobOrThrow(name);
    if (job.disabled || this.activeHandles.has(name)) {
      return;
    }

    if (job.kind === "cron") {
      const task = cron.schedule(job.expression!, () => {
        void this.runJob(name).catch(() => undefined);
      }, {
        timezone: job.timeZone || getSchedulerConfiguration().defaultTimeZone,
      });

      this.activeHandles.set(name, {
        kind: "cron",
        handle: task,
      });

      if (job.runOnInit) {
        await this.runJob(name);
      }
      this.syncStartedState();
      return;
    }

    if (job.kind === "interval") {
      const handle = setInterval(() => {
        void this.runJob(name).catch(() => undefined);
      }, job.intervalMs!);

      this.activeHandles.set(name, {
        kind: "interval",
        handle,
      });

      if (job.runOnInit) {
        await this.runJob(name);
      }
      this.syncStartedState();
      return;
    }

    if (job.runOnBoot && job.bootExecuted) {
      this.syncStartedState();
      return;
    }

    const handle = setTimeout(() => {
      void this.runJob(name)
        .catch(() => undefined)
        .finally(() => {
          this.activeHandles.delete(name);
          this.syncStartedState();
        });
    }, job.delayMs!);

    this.activeHandles.set(name, {
      kind: "timeout",
      handle,
    });
    this.syncStartedState();
  }

  async stopJob(name: string): Promise<void> {
    const activeHandle = this.activeHandles.get(name);
    if (!activeHandle) {
      return;
    }

    if (activeHandle.kind === "cron") {
      activeHandle.handle.stop?.();
      activeHandle.handle.destroy?.();
    }

    if (activeHandle.kind === "interval") {
      clearInterval(activeHandle.handle);
    }

    if (activeHandle.kind === "timeout") {
      clearTimeout(activeHandle.handle);
    }

    this.activeHandles.delete(name);
    this.syncStartedState();
  }

  async runJob(name: string): Promise<void> {
    const job = this.getJobOrThrow(name);
    if (job.running && !job.allowOverlap) {
      return;
    }

    job.running = true;
    job.lastRunAt = new Date();
    job.runCount += 1;
    job.lastError = undefined;

    try {
      await this.executeJob(job);
    } catch (error: any) {
      job.lastError = error instanceof Error ? error : new Error(String(error));
      job.failureCount += 1;
      throw error;
    } finally {
      job.running = false;
      job.lastFinishedAt = new Date();
    }
  }

  private discoverJobs(container?: Container): void {
    if (!container || typeof (container as any).getRegisteredTypes !== "function") {
      return;
    }

    const registeredTypes = (container as any).getRegisteredTypes() as any[];
    const configuration = getSchedulerConfiguration();

    for (const type of registeredTypes) {
      const metadata = getScheduledMethodMetadata(type);
      if (!metadata.length) {
        continue;
      }

      const instance = container.get(type);
      for (const scheduledMethod of metadata) {
        const methodName = String(scheduledMethod.method);
        const jobName = normalizeJobName(type.name || "Anonymous", methodName, scheduledMethod);

        if (this.jobs.has(jobName) && configuration.failOnDuplicateJobNames) {
          throw new Error(`Duplicate scheduler job name '${jobName}' detected`);
        }

        this.jobs.set(jobName, {
          name: jobName,
          kind: scheduledMethod.kind,
          expression: scheduledMethod.expression,
          intervalMs: scheduledMethod.intervalMs,
          delayMs: scheduledMethod.delayMs,
          methodName,
          targetName: type.name || "Anonymous",
          groups: [...(scheduledMethod.groups || [])],
          disabled: scheduledMethod.options.disabled === true,
          allowOverlap: scheduledMethod.options.allowOverlap === true,
          runOnBoot: scheduledMethod.options.runOnBoot === true,
          runOnInit: scheduledMethod.options.runOnInit === true,
          maxRetries: Math.max(0, scheduledMethod.options.maxRetries || 0),
          retryDelayMs: scheduledMethod.retryDelayMs || 0,
          timeZone: scheduledMethod.options.timeZone,
          onError: scheduledMethod.options.onError,
          onRetry: scheduledMethod.options.onRetry,
          instance,
          invoke: instance[scheduledMethod.method].bind(instance),
          runCount: 0,
          failureCount: 0,
          bootExecuted: false,
          running: false,
        });
      }
    }
  }

  async runBootJobs(): Promise<void> {
    for (const job of this.jobs.values()) {
      if (job.disabled || !job.runOnBoot) {
        continue;
      }

      await this.runJob(job.name);
      job.bootExecuted = true;
    }
  }

  private getJobsByGroup(group: string): DiscoveredJob[] {
    const normalizedGroup = group.trim();
    if (!normalizedGroup) {
      throw new Error("Scheduler group requires a non-empty name");
    }

    return Array.from(this.jobs.values()).filter((job) => job.groups.includes(normalizedGroup));
  }

  private getJobOrThrow(name: string): DiscoveredJob {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`Scheduler job '${name}' is not registered`);
    }
    return job;
  }

  private registerContainerBindings(container?: Container): void {
    if (!container) {
      return;
    }

    const anyContainer = container as any;
    if (typeof anyContainer.registerNamedInstance === "function") {
      anyContainer.registerNamedInstance(getSchedulerLifecycleToken(), this);
    }

    if (typeof anyContainer.registerWithName === "function") {
      anyContainer.registerWithName(SchedulerService, { scope: "singleton" }, getSchedulerServiceToken());
    }
  }

  private async executeJob(job: DiscoveredJob): Promise<void> {
    let attempt = 0;

    while (true) {
      try {
        await Promise.resolve(job.invoke.call(job.instance));
        return;
      } catch (error: any) {
        const resolvedError = error instanceof Error ? error : new Error(String(error));
        if (attempt >= job.maxRetries) {
          await this.invokeErrorHook(job, resolvedError);
          throw resolvedError;
        }

        attempt += 1;
        await this.invokeRetryHook(job, resolvedError, attempt);
        await wait(job.retryDelayMs);
      }
    }
  }

  private createJobContext(job: DiscoveredJob): SchedulerJobContext {
    return {
      name: job.name,
      kind: job.kind,
      methodName: job.methodName,
      targetName: job.targetName,
      groups: [...job.groups],
    };
  }

  private async invokeErrorHook(job: DiscoveredJob, error: Error): Promise<void> {
    const hook = this.resolveHook(job.instance, job.onError);
    if (!hook) {
      return;
    }

    await Promise.resolve(hook(error, this.createJobContext(job)));
  }

  private async invokeRetryHook(job: DiscoveredJob, error: Error, attempt: number): Promise<void> {
    const hook = this.resolveHook(job.instance, job.onRetry);
    if (!hook) {
      return;
    }

    await Promise.resolve(hook(error, attempt, this.createJobContext(job)));
  }

  private resolveHook<T extends Function>(instance: any, hook?: T | string): T | undefined {
    if (!hook) {
      return undefined;
    }

    if (typeof hook === "function") {
      return hook as T;
    }

    const resolved = instance?.[hook];
    if (typeof resolved !== "function") {
      throw new Error(`Scheduler hook '${hook}' is not a function on ${instance?.constructor?.name || "Unknown"}`);
    }

    return resolved.bind(instance) as T;
  }

  private syncStartedState(): void {
    this.started = this.activeHandles.size > 0;
  }
}

const lifecycleManager = new SchedulerLifecycleManager();

export const initializeSchedulerIntegration = async (
  container?: Container,
  lifecycle?: ApplicationLifeCycle
): Promise<void> => {
  await lifecycleManager.initialize(container, lifecycle);
  await lifecycleManager.runBootJobs();
};

export const shutdownSchedulerIntegration = async (): Promise<void> => {
  await lifecycleManager.destroy();
};

export const getSchedulerLifecycleManager = (): SchedulerLifecycleManager => {
  return lifecycleManager;
};

export const resetSchedulerIntegration = async (): Promise<void> => {
  await shutdownSchedulerIntegration();
  resetSchedulerConfiguration();
};