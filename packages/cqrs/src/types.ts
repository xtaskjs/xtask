import type { Container } from "@xtaskjs/core";
import type { CommandBus, EventBus, QueryBus } from "./bus";
import type { CqrsLifecycleManager } from "./lifecycle";

export type MessageReference<T = any> = string | (new (...args: any[]) => T);

export interface CqrsOptions {
  readDataSourceName?: string;
  writeDataSourceName?: string;
  idempotencyStore?: IIdempotencyStore;
}

export interface ICommandHandler<TCommand = any, TResult = any> {
  execute(command: TCommand): Promise<TResult> | TResult;
}

export interface IQueryHandler<TQuery = any, TResult = any> {
  execute(query: TQuery): Promise<TResult> | TResult;
}

export interface IEventHandler<TEvent = any> {
  handle(event: TEvent): Promise<void> | void;
}

export interface ProcessManagerContext {
  commandBus: CommandBus;
  queryBus: QueryBus;
  eventBus: EventBus;
  container?: Container;
  lifecycle: CqrsLifecycleManager;
}

export interface IProcessManager<TEvent = any> {
  handle(event: TEvent, context: ProcessManagerContext): Promise<void> | void;
}

export interface ISaga<TEvent = any> extends IProcessManager<TEvent> {}

export interface ProjectionRebuildContext {
  name: string;
  container?: Container;
  lifecycle: CqrsLifecycleManager;
}

export interface IProjectionRebuilder {
  rebuild(context: ProjectionRebuildContext): Promise<void> | void;
}

export interface IdempotentCommandOptions<TCommand = any> {
  key?: (command: TCommand) => string;
  ttlMs?: number;
}

export interface IIdempotencyStore {
  get<TResult = any>(key: string): Promise<TResult | undefined> | TResult | undefined;
  set<TResult = any>(key: string, value: TResult, ttlMs?: number): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  clear?(): Promise<void> | void;
}