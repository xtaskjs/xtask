import { AutoWired, Qualifier } from "@xtaskjs/core";
import {
  defineCommandHandlerMetadata,
  defineEventHandlerMetadata,
  defineIdempotentCommandMetadata,
  defineProcessManagerMetadata,
  defineProjectionRebuilderMetadata,
  defineQueryHandlerMetadata,
} from "./metadata";
import {
  getCommandBusToken,
  getCqrsLifecycleToken,
  getEventBusToken,
  getIdempotencyStoreToken,
  getReadDataSourceToken,
  getReadRepositoryToken,
  getWriteDataSourceToken,
  getWriteRepositoryToken,
  getQueryBusToken,
} from "./tokens";
import { IdempotentCommandOptions, MessageReference } from "./types";

const applyQualifier = (token: string): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const CommandHandler = (command: MessageReference): ClassDecorator => {
  return (target) => {
    defineCommandHandlerMetadata(target, command);
  };
};

export const QueryHandler = (query: MessageReference): ClassDecorator => {
  return (target) => {
    defineQueryHandlerMetadata(target, query);
  };
};

export const EventHandler = (event: MessageReference | MessageReference[]): ClassDecorator => {
  return (target) => {
    defineEventHandlerMetadata(target, Array.isArray(event) ? event : [event]);
  };
};

export const ProcessManager = (event: MessageReference | MessageReference[]): ClassDecorator => {
  return (target) => {
    defineProcessManagerMetadata(target, Array.isArray(event) ? event : [event]);
  };
};

export const Saga = ProcessManager;

export const ProjectionRebuilder = (name: string): ClassDecorator => {
  return (target) => {
    defineProjectionRebuilderMetadata(target, name);
  };
};

export const IdempotentCommand = <TCommand = any>(
  options: IdempotentCommandOptions<TCommand> = {}
): ClassDecorator => {
  return (target) => {
    defineIdempotentCommandMetadata(target, options);
  };
};

export const InjectCommandBus = (): ParameterDecorator & PropertyDecorator => {
  return applyQualifier(getCommandBusToken());
};

export const InjectQueryBus = (): ParameterDecorator & PropertyDecorator => {
  return applyQualifier(getQueryBusToken());
};

export const InjectEventBus = (): ParameterDecorator & PropertyDecorator => {
  return applyQualifier(getEventBusToken());
};

export const InjectIdempotencyStore = (): ParameterDecorator & PropertyDecorator => {
  return applyQualifier(getIdempotencyStoreToken());
};

export const InjectCqrsLifecycleManager = (): ParameterDecorator & PropertyDecorator => {
  return applyQualifier(getCqrsLifecycleToken());
};

export const InjectReadDataSource = (): ParameterDecorator & PropertyDecorator => {
  return applyQualifier(getReadDataSourceToken());
};

export const InjectWriteDataSource = (): ParameterDecorator & PropertyDecorator => {
  return applyQualifier(getWriteDataSourceToken());
};

export const InjectReadRepository = (entity: MessageReference): ParameterDecorator & PropertyDecorator => {
  return applyQualifier(getReadRepositoryToken(entity));
};

export const InjectWriteRepository = (entity: MessageReference): ParameterDecorator & PropertyDecorator => {
  return applyQualifier(getWriteRepositoryToken(entity));
};