import { ApplicationLifeCycle, Container } from "@xtaskjs/core";
import { DataSource, ObjectLiteral, ObjectType, Repository } from "typeorm";
import { getTypeOrmLifecycleManager } from "@xtaskjs/typeorm";
import { CommandBus, EventBus, QueryBus } from "./bus";
import { getCqrsConfiguration, resetCqrsConfiguration } from "./configuration";
import { MemoryIdempotencyStore } from "./idempotency";
import {
  getCommandHandlerMetadata,
  getEventHandlerMetadata,
  getIdempotentCommandMetadata,
  getProcessManagerMetadata,
  getProjectionRebuilderMetadata,
  getQueryHandlerMetadata,
  resolveMessageName,
  resolvePayloadMessageName,
} from "./metadata";
import {
  getCommandBusToken,
  getCommandHandlerToken,
  getCqrsLifecycleToken,
  getEventBusToken,
  getIdempotencyStoreToken,
  getProjectionRebuilderToken,
  getQueryHandlerToken,
  getQueryBusToken,
  getReadDataSourceToken,
  getReadRepositoryToken,
  getWriteDataSourceToken,
  getWriteRepositoryToken,
} from "./tokens";
import {
  IIdempotencyStore,
  ICommandHandler,
  IEventHandler,
  IProcessManager,
  IProjectionRebuilder,
  IQueryHandler,
  MessageReference,
  ProcessManagerContext,
} from "./types";

const assertHandlerMethod = (handler: any, method: "execute" | "handle", messageType: string): void => {
  if (typeof handler?.[method] !== "function") {
    throw new Error(`CQRS ${messageType} handler '${handler?.constructor?.name || "anonymous"}' must define ${method}()`);
  }
};

export class CqrsLifecycleManager {
  private container?: Container;
  private lifecycle?: ApplicationLifeCycle;
  private stoppingRegistered = false;
  private initialized = false;
  private idempotencyStore: IIdempotencyStore = new MemoryIdempotencyStore();
  private readonly commandHandlers = new Map<string, ICommandHandler<any, any>>();
  private readonly queryHandlers = new Map<string, IQueryHandler<any, any>>();
  private readonly eventHandlers = new Map<string, IEventHandler<any>[]>();
  private readonly processManagers = new Map<string, IProcessManager<any>[]>();
  private readonly projectionRebuilders = new Map<string, IProjectionRebuilder>();
  private readonly idempotentCommands = new Map<string, { key?: (command: any) => string; ttlMs?: number }>();
  private readonly inFlightIdempotentCommands = new Map<string, Promise<any>>();
  private readonly commandBus = new CommandBus((command) => this.executeCommand(command));
  private readonly queryBus = new QueryBus((query) => this.executeQuery(query));
  private readonly eventBus = new EventBus((event) => this.publishEvent(event));

  async initialize(container?: Container, lifecycle?: ApplicationLifeCycle): Promise<void> {
    await this.destroy();
    this.container = container;
    this.lifecycle = lifecycle;
    this.idempotencyStore = getCqrsConfiguration().idempotencyStore || new MemoryIdempotencyStore();
    this.registerCoreContainerBindings(container);
    this.registerHandlers(container);
    this.registerHandlerContainerBindings(container);
    this.initialized = true;

    if (!this.stoppingRegistered && lifecycle && typeof (lifecycle as any).on === "function") {
      lifecycle.on("stopping", async () => {
        await this.destroy();
      });
      this.stoppingRegistered = true;
    }
  }

  async destroy(): Promise<void> {
    this.commandHandlers.clear();
    this.queryHandlers.clear();
    this.eventHandlers.clear();
    this.processManagers.clear();
    this.projectionRebuilders.clear();
    this.idempotentCommands.clear();
    this.inFlightIdempotentCommands.clear();
    if (typeof this.idempotencyStore.clear === "function") {
      await this.idempotencyStore.clear();
    }
    this.idempotencyStore = new MemoryIdempotencyStore();
    this.container = undefined;
    this.lifecycle = undefined;
    this.initialized = false;
    this.stoppingRegistered = false;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getContainer(): Container | undefined {
    return this.container;
  }

  getLifecycle(): ApplicationLifeCycle | undefined {
    return this.lifecycle;
  }

  getCommandBus(): CommandBus {
    return this.commandBus;
  }

  getQueryBus(): QueryBus {
    return this.queryBus;
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getIdempotencyStore(): IIdempotencyStore {
    return this.idempotencyStore;
  }

  getReadDataSource(): DataSource {
    const configuration = getCqrsConfiguration();
    return this.getConfiguredDataSource(configuration.readDataSourceName, "read");
  }

  getWriteDataSource(): DataSource {
    const configuration = getCqrsConfiguration();
    return this.getConfiguredDataSource(configuration.writeDataSourceName, "write");
  }

  getReadRepository<T extends ObjectLiteral>(entity: ObjectType<T>): Repository<T> {
    return this.getReadDataSource().getRepository(entity);
  }

  getWriteRepository<T extends ObjectLiteral>(entity: ObjectType<T>): Repository<T> {
    return this.getWriteDataSource().getRepository(entity);
  }

  listProjectionRebuilders(): string[] {
    return Array.from(this.projectionRebuilders.keys()).sort();
  }

  async rebuildProjection(name: string): Promise<void> {
    const normalizedName = name.trim();
    const rebuilder = this.projectionRebuilders.get(normalizedName);
    if (!rebuilder) {
      throw new Error(`No CQRS projection rebuilder registered for '${normalizedName}'`);
    }

    await rebuilder.rebuild({
      name: normalizedName,
      container: this.container,
      lifecycle: this,
    });
  }

  async rebuildAllProjections(): Promise<string[]> {
    const names = this.listProjectionRebuilders();
    for (const name of names) {
      await this.rebuildProjection(name);
    }
    return names;
  }

  async executeCommand<TResult = any>(command: any): Promise<TResult> {
    const messageName = resolvePayloadMessageName(command);
    const handler = this.commandHandlers.get(messageName);
    if (!handler) {
      throw new Error(`No CQRS command handler registered for '${messageName}'`);
    }

    const idempotencyMetadata = this.idempotentCommands.get(messageName);
    if (!idempotencyMetadata) {
      return handler.execute(command) as Promise<TResult>;
    }

    const idempotencyKey = this.resolveIdempotencyKey(messageName, command, idempotencyMetadata);
    const inFlight = this.inFlightIdempotentCommands.get(idempotencyKey);
    if (inFlight) {
      return inFlight as Promise<TResult>;
    }

    const cached = await Promise.resolve(this.idempotencyStore.get<TResult>(idempotencyKey));
    if (cached !== undefined) {
      return cached;
    }

    const execution = Promise.resolve(handler.execute(command) as Promise<TResult>)
      .then(async (result) => {
        await Promise.resolve(this.idempotencyStore.set(idempotencyKey, result, idempotencyMetadata.ttlMs));
        return result;
      })
      .finally(() => {
        this.inFlightIdempotentCommands.delete(idempotencyKey);
      });

    this.inFlightIdempotentCommands.set(idempotencyKey, execution);

    return execution;
  }

  async executeQuery<TResult = any>(query: any): Promise<TResult> {
    const key = resolvePayloadMessageName(query);
    const handler = this.queryHandlers.get(key);
    if (!handler) {
      throw new Error(`No CQRS query handler registered for '${key}'`);
    }

    return handler.execute(query) as Promise<TResult>;
  }

  async publishEvent(event: any): Promise<void> {
    const key = resolvePayloadMessageName(event);
    const handlers = this.eventHandlers.get(key) || [];
    const processManagers = this.processManagers.get(key) || [];

    for (const handler of handlers) {
      await handler.handle(event);
    }

    if (processManagers.length === 0) {
      return;
    }

    const context: ProcessManagerContext = {
      commandBus: this.commandBus,
      queryBus: this.queryBus,
      eventBus: this.eventBus,
      container: this.container,
      lifecycle: this,
    };

    for (const processManager of processManagers) {
      await processManager.handle(event, context);
    }
  }

  private registerHandlers(container?: Container): void {
    if (!container) {
      return;
    }

    for (const type of container.getRegisteredTypes()) {
      const commandMetadata = getCommandHandlerMetadata(type);
      const queryMetadata = getQueryHandlerMetadata(type);
      const eventMetadata = getEventHandlerMetadata(type);
      const processManagerMetadata = getProcessManagerMetadata(type);
      const projectionRebuilderMetadata = getProjectionRebuilderMetadata(type);

      if (!commandMetadata && !queryMetadata && !eventMetadata && !processManagerMetadata && !projectionRebuilderMetadata) {
        continue;
      }

      const instance = container.get(type);

      if (commandMetadata) {
        const key = resolveMessageName(commandMetadata.command);
        if (this.commandHandlers.has(key)) {
          throw new Error(`Multiple CQRS command handlers registered for '${key}'`);
        }
        assertHandlerMethod(instance, "execute", "command");
        this.commandHandlers.set(key, instance as ICommandHandler<any, any>);

        const idempotencyMetadata = getIdempotentCommandMetadata(type);
        if (idempotencyMetadata) {
          this.idempotentCommands.set(key, idempotencyMetadata);
        }
      }

      if (queryMetadata) {
        const key = resolveMessageName(queryMetadata.query);
        if (this.queryHandlers.has(key)) {
          throw new Error(`Multiple CQRS query handlers registered for '${key}'`);
        }
        assertHandlerMethod(instance, "execute", "query");
        this.queryHandlers.set(key, instance as IQueryHandler<any, any>);
      }

      if (eventMetadata) {
        assertHandlerMethod(instance, "handle", "event");
        for (const event of eventMetadata.events) {
          const key = resolveMessageName(event);
          const handlers = this.eventHandlers.get(key) || [];
          handlers.push(instance as IEventHandler<any>);
          this.eventHandlers.set(key, handlers);
        }
      }

      if (processManagerMetadata) {
        assertHandlerMethod(instance, "handle", "process manager");
        for (const event of processManagerMetadata.events) {
          const key = resolveMessageName(event);
          const managers = this.processManagers.get(key) || [];
          managers.push(instance as IProcessManager<any>);
          this.processManagers.set(key, managers);
        }
      }

      if (projectionRebuilderMetadata) {
        if (typeof (instance as IProjectionRebuilder).rebuild !== "function") {
          throw new Error(
            `CQRS projection rebuilder '${type.name || "anonymous"}' must define rebuild()`
          );
        }

        if (this.projectionRebuilders.has(projectionRebuilderMetadata.name)) {
          throw new Error(
            `Multiple CQRS projection rebuilders registered for '${projectionRebuilderMetadata.name}'`
          );
        }

        this.projectionRebuilders.set(projectionRebuilderMetadata.name, instance as IProjectionRebuilder);
      }
    }
  }

  private registerCoreContainerBindings(container?: Container): void {
    if (!container) {
      return;
    }

    const anyContainer = container as any;
    if (typeof anyContainer.registerNamedInstance !== "function") {
      return;
    }

    anyContainer.registerNamedInstance(getCqrsLifecycleToken(), this);
    anyContainer.registerNamedInstance(getCommandBusToken(), this.commandBus);
    anyContainer.registerNamedInstance(getQueryBusToken(), this.queryBus);
    anyContainer.registerNamedInstance(getEventBusToken(), this.eventBus);
    anyContainer.registerNamedInstance(getIdempotencyStoreToken(), this.idempotencyStore);

    const readDataSource = this.getReadDataSource();
    const writeDataSource = this.getWriteDataSource();
    anyContainer.registerNamedInstance(getReadDataSourceToken(), readDataSource);
    anyContainer.registerNamedInstance(getWriteDataSourceToken(), writeDataSource);

    this.registerRepositoryAliases("read", readDataSource, anyContainer);
    this.registerRepositoryAliases("write", writeDataSource, anyContainer);
  }

  private registerHandlerContainerBindings(container?: Container): void {
    if (!container) {
      return;
    }

    const anyContainer = container as any;
    if (typeof anyContainer.registerNamedInstance !== "function") {
      return;
    }

    for (const registration of this.commandHandlers.entries()) {
      anyContainer.registerNamedInstance(getCommandHandlerToken(registration[0]), registration[1]);
    }

    for (const registration of this.queryHandlers.entries()) {
      anyContainer.registerNamedInstance(getQueryHandlerToken(registration[0]), registration[1]);
    }

    for (const registration of this.projectionRebuilders.entries()) {
      anyContainer.registerNamedInstance(getProjectionRebuilderToken(registration[0]), registration[1]);
    }
  }

  private resolveIdempotencyKey(
    messageName: string,
    command: any,
    metadata: { key?: (command: any) => string; ttlMs?: number }
  ): string {
    const explicitKey = metadata.key?.(command);
    if (typeof explicitKey === "string" && explicitKey.trim().length > 0) {
      return `${messageName}:${explicitKey.trim()}`;
    }

    if (typeof command?.idempotencyKey === "string" && command.idempotencyKey.trim().length > 0) {
      return `${messageName}:${command.idempotencyKey.trim()}`;
    }

    if (typeof command?.id === "string" && command.id.trim().length > 0) {
      return `${messageName}:${command.id.trim()}`;
    }

    return `${messageName}:${JSON.stringify(command)}`;
  }

  private registerRepositoryAliases(
    side: "read" | "write",
    dataSource: DataSource,
    container: { registerNamedInstance(name: string, instance: any): void }
  ): void {
    for (const metadata of dataSource.entityMetadatas) {
      const entityTarget = metadata.target;
      if (typeof entityTarget !== "function" && typeof entityTarget !== "string") {
        continue;
      }

      const repository = dataSource.getRepository(entityTarget as any);
      const token = side === "read"
        ? getReadRepositoryToken(entityTarget as MessageReference)
        : getWriteRepositoryToken(entityTarget as MessageReference);
      container.registerNamedInstance(token, repository);
    }
  }

  private getConfiguredDataSource(name: string, side: "read" | "write"): DataSource {
    try {
      return getTypeOrmLifecycleManager().getDataSource(name);
    } catch (error: any) {
      throw new Error(
        `CQRS ${side} datasource '${name}' is not initialized. Register it with @xtaskjs/typeorm and ensure initializeTypeOrmIntegration() runs before initializeCqrsIntegration().`
      );
    }
  }
}

const lifecycleManager = new CqrsLifecycleManager();

export const initializeCqrsIntegration = async (
  container?: Container,
  lifecycle?: ApplicationLifeCycle
): Promise<void> => {
  await lifecycleManager.initialize(container, lifecycle);
};

export const shutdownCqrsIntegration = async (): Promise<void> => {
  await lifecycleManager.destroy();
};

export const getCqrsLifecycleManager = (): CqrsLifecycleManager => {
  return lifecycleManager;
};

export const resetCqrsIntegration = async (): Promise<void> => {
  await shutdownCqrsIntegration();
  resetCqrsConfiguration();
};