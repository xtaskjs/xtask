export type SchedulerJobKind = "cron" | "interval" | "timeout";

export type SchedulerIntervalInput = number | string;

export type SchedulerJobGroupInput = string | string[];

export interface SchedulerJobContext {
  name: string;
  kind: SchedulerJobKind;
  methodName: string;
  targetName: string;
  groups: string[];
}

export type SchedulerJobErrorHandler = (
  error: Error,
  context: SchedulerJobContext
) => any | Promise<any>;

export type SchedulerJobRetryHandler = (
  error: Error,
  attempt: number,
  context: SchedulerJobContext
) => any | Promise<any>;

export interface SchedulerJobOptions {
  name?: string;
  disabled?: boolean;
  runOnInit?: boolean;
  runOnBoot?: boolean;
  allowOverlap?: boolean;
  group?: SchedulerJobGroupInput;
  maxRetries?: number;
  retryDelay?: SchedulerIntervalInput;
  onError?: SchedulerJobErrorHandler | string;
  onRetry?: SchedulerJobRetryHandler | string;
  timeZone?: string;
}

export interface SchedulerCronOptions extends SchedulerJobOptions {}

export interface SchedulerIntervalOptions extends SchedulerJobOptions {}

export interface SchedulerTimeoutOptions extends Omit<SchedulerJobOptions, "runOnInit" | "timeZone"> {}

export interface SchedulerConfiguration {
  autoStart?: boolean;
  defaultTimeZone?: string;
  failOnDuplicateJobNames?: boolean;
}

export interface ScheduledMethodMetadata {
  kind: SchedulerJobKind;
  method: string | symbol;
  name?: string;
  expression?: string;
  intervalMs?: number;
  delayMs?: number;
  groups?: string[];
  retryDelayMs?: number;
  options: SchedulerJobOptions;
}

export interface SchedulerJobSummary {
  name: string;
  kind: SchedulerJobKind;
  methodName: string;
  targetName: string;
  groups: string[];
  expression?: string;
  intervalMs?: number;
  delayMs?: number;
  disabled: boolean;
  started: boolean;
  running: boolean;
  runOnBoot: boolean;
  runOnInit: boolean;
  maxRetries: number;
  retryDelayMs: number;
  failureCount: number;
  bootExecuted: boolean;
  runCount: number;
  lastRunAt?: Date;
  lastFinishedAt?: Date;
  lastError?: Error;
}