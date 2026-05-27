import { Body, Param, Query } from "@xtaskjs/common";
import {
  defineClassSourceSchema,
  defineDtoSchema,
  defineMethodSourceSchema,
  defineParameterSchema,
} from "./metadata";
import type { ValidationSchemaSource } from "./types";

export const SchemaDto = (schema: unknown): ClassDecorator => {
  return (target) => {
    defineDtoSchema(target, schema);
  };
};

export const UseValidationSchema = (
  source: ValidationSchemaSource,
  schema: unknown
): MethodDecorator & ClassDecorator => {
  return (target: object, propertyKey?: string | symbol) => {
    if (!propertyKey) {
      defineClassSourceSchema(target, source, schema);
      return;
    }

    defineMethodSourceSchema((target as { constructor: object }).constructor, propertyKey, source, schema);
  };
};

export const UseBodySchema = (schema: unknown): MethodDecorator & ClassDecorator => {
  return UseValidationSchema("body", schema);
};

export const UseQuerySchema = (schema: unknown): MethodDecorator & ClassDecorator => {
  return UseValidationSchema("query", schema);
};

export const UseParamSchema = (schema: unknown): MethodDecorator & ClassDecorator => {
  return UseValidationSchema("param", schema);
};

export const Validate = (schema: unknown): ParameterDecorator => {
  return (target, propertyKey, parameterIndex) => {
    if (!propertyKey) {
      throw new Error("Validate can only be used on controller method parameters");
    }

    defineParameterSchema((target as { constructor: object }).constructor, propertyKey, parameterIndex, schema);
  };
};

const buildValidatedParameterDecorator = (
  bind: (property?: string) => ParameterDecorator
) => {
  return (schema: unknown, property?: string): ParameterDecorator => {
    const baseDecorator = bind(property);
    return (target, propertyKey, parameterIndex) => {
      baseDecorator(target, propertyKey, parameterIndex);

      if (!propertyKey) {
        throw new Error("Validated route decorators can only be used on controller methods");
      }

      defineParameterSchema(
        (target as { constructor: object }).constructor,
        propertyKey,
        parameterIndex,
        schema
      );
    };
  };
};

export const ValidatedBody = buildValidatedParameterDecorator(Body);
export const ValidatedQuery = buildValidatedParameterDecorator(Query);
export const ValidatedParam = buildValidatedParameterDecorator(Param);