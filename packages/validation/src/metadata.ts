import type { RouteExecutionContext, RouteParameterMetadata } from "@xtaskjs/common";
import type { ResolvedSchemaMetadata, ValidationSchemaSource } from "./types";

type MethodSchemaEntry = {
  handler: PropertyKey;
  sourceSchemas: Partial<Record<ValidationSchemaSource, unknown>>;
};

type ParameterSchemaEntry = {
  handler: PropertyKey;
  index: number;
  schema: unknown;
};

const DTO_SCHEMA_KEY = Symbol("xtaskjs:validation:dtoSchema");
const CLASS_SOURCE_SCHEMA_KEY = Symbol("xtaskjs:validation:classSourceSchemas");
const METHOD_SOURCE_SCHEMA_KEY = Symbol("xtaskjs:validation:methodSourceSchemas");
const PARAMETER_SCHEMA_KEY = Symbol("xtaskjs:validation:parameterSchemas");

const getMethodSourceSchemas = (target: object): MethodSchemaEntry[] => {
  return (Reflect.getMetadata(METHOD_SOURCE_SCHEMA_KEY, target) as MethodSchemaEntry[] | undefined) || [];
};

const setMethodSourceSchemas = (target: object, value: MethodSchemaEntry[]): void => {
  Reflect.defineMetadata(METHOD_SOURCE_SCHEMA_KEY, value, target);
};

const getParameterSchemas = (target: object): ParameterSchemaEntry[] => {
  return (Reflect.getMetadata(PARAMETER_SCHEMA_KEY, target) as ParameterSchemaEntry[] | undefined) || [];
};

const setParameterSchemas = (target: object, value: ParameterSchemaEntry[]): void => {
  Reflect.defineMetadata(PARAMETER_SCHEMA_KEY, value, target);
};

export const defineDtoSchema = (target: object, schema: unknown): void => {
  Reflect.defineMetadata(DTO_SCHEMA_KEY, schema, target);
};

export const getDtoSchema = (target: object | undefined): unknown => {
  if (!target) {
    return undefined;
  }

  return Reflect.getMetadata(DTO_SCHEMA_KEY, target);
};

export const defineClassSourceSchema = (
  target: object,
  source: ValidationSchemaSource,
  schema: unknown
): void => {
  const existing =
    (Reflect.getMetadata(CLASS_SOURCE_SCHEMA_KEY, target) as Partial<Record<ValidationSchemaSource, unknown>> | undefined) ||
    {};
  existing[source] = schema;
  Reflect.defineMetadata(CLASS_SOURCE_SCHEMA_KEY, existing, target);
};

export const defineMethodSourceSchema = (
  target: object,
  handler: PropertyKey,
  source: ValidationSchemaSource,
  schema: unknown
): void => {
  const entries = getMethodSourceSchemas(target);
  let entry = entries.find((candidate) => candidate.handler === handler);
  if (!entry) {
    entry = {
      handler,
      sourceSchemas: {},
    };
    entries.push(entry);
  }

  entry.sourceSchemas[source] = schema;
  setMethodSourceSchemas(target, entries);
};

export const defineParameterSchema = (
  target: object,
  handler: PropertyKey,
  index: number,
  schema: unknown
): void => {
  const entries = getParameterSchemas(target);
  const existing = entries.find(
    (candidate) => candidate.handler === handler && candidate.index === index
  );

  if (existing) {
    existing.schema = schema;
  } else {
    entries.push({ handler, index, schema });
  }

  setParameterSchemas(target, entries);
};

export const resolveSchemaMetadata = (
  context: RouteExecutionContext,
  parameter?: RouteParameterMetadata
): ResolvedSchemaMetadata | undefined => {
  if (!parameter || (parameter.source !== "body" && parameter.source !== "query" && parameter.source !== "param")) {
    return undefined;
  }

  const controllerType = context.controller?.constructor as object | undefined;
  const handler = context.handler;
  if (!controllerType || !handler) {
    return parameter.metatype
      ? (() => {
          const schema = getDtoSchema(parameter.metatype as object | undefined);
          return schema ? { schema, origin: "dto" as const } : undefined;
        })()
      : undefined;
  }

  const parameterSchema = getParameterSchemas(controllerType).find(
    (candidate) => candidate.handler === handler && candidate.index === parameter.index
  );
  if (parameterSchema) {
    return {
      schema: parameterSchema.schema,
      origin: "parameter",
    };
  }

  const methodSchema = getMethodSourceSchemas(controllerType).find(
    (candidate) => candidate.handler === handler
  )?.sourceSchemas[parameter.source];
  if (methodSchema) {
    return {
      schema: methodSchema,
      origin: "source",
    };
  }

  const classSchema = (
    Reflect.getMetadata(CLASS_SOURCE_SCHEMA_KEY, controllerType) as
      | Partial<Record<ValidationSchemaSource, unknown>>
      | undefined
  )?.[parameter.source];
  if (classSchema) {
    return {
      schema: classSchema,
      origin: "source",
    };
  }

  const dtoSchema = getDtoSchema(parameter.metatype as object | undefined);
  if (dtoSchema) {
    return {
      schema: dtoSchema,
      origin: "dto",
    };
  }

  return undefined;
};