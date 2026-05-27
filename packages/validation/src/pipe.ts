import type { RouteExecutionContext, RouteParameterMetadata } from "@xtaskjs/common";
import { getCurrentContainer } from "@xtaskjs/core";
import { resolveSchemaMetadata } from "./metadata";
import { ValidationService } from "./service";
import type { ValidationServiceLike } from "./types";
import { getValidationLifecycleManager } from "./lifecycle";
import { getValidationServiceToken } from "./tokens";

const INTERNAL_STATE_KEYS = {
  argumentIndex: "__xtaskArgumentIndex",
  routeParameters: "__xtaskRouteParameters",
} as const;

const PRIMITIVE_METATYPES = new Set<unknown>([String, Boolean, Number, Array, Object, Date]);

const coercePrimitiveValue = (value: unknown, metatype?: unknown): unknown => {
  if (value === undefined || value === null || !metatype) {
    return value;
  }

  if (metatype === String) {
    return String(value);
  }

  if (metatype === Number) {
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? value : numericValue;
  }

  if (metatype === Boolean) {
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") {
        return true;
      }

      if (value.toLowerCase() === "false") {
        return false;
      }
    }

    return Boolean(value);
  }

  return value;
};

const assignToMetatype = (value: unknown, metatype: unknown): unknown => {
  if (
    !metatype ||
    typeof metatype !== "function" ||
    value === null ||
    typeof value !== "object" ||
    PRIMITIVE_METATYPES.has(metatype)
  ) {
    return value;
  }

  return Object.assign(new (metatype as new () => object)(), value);
};

const resolveValidationService = (): ValidationServiceLike => {
  const container = getCurrentContainer() as
    | { getByName?: <T>(name: string) => T }
    | undefined;

  if (container && typeof container.getByName === "function") {
    try {
      return container.getByName<ValidationServiceLike>(getValidationServiceToken());
    } catch {
      // Fall back to module-level service.
    }
  }

  const lifecycleService = getValidationLifecycleManager()?.getService();
  if (lifecycleService) {
    return lifecycleService;
  }

  return new ValidationService();
};

const getCurrentParameter = (
  context: RouteExecutionContext
): RouteParameterMetadata | undefined => {
  const argumentIndex = context.state[INTERNAL_STATE_KEYS.argumentIndex];
  const routeParameters = context.state[INTERNAL_STATE_KEYS.routeParameters] as
    | RouteParameterMetadata[]
    | undefined;

  return routeParameters?.find((candidate) => candidate.index === argumentIndex);
};

export class SchemaValidationPipe {
  async transform(value: unknown, context: RouteExecutionContext): Promise<unknown> {
    const parameter = getCurrentParameter(context);
    if (!parameter) {
      return value;
    }

    const resolvedMetadata = resolveSchemaMetadata(context, parameter);
    if (!resolvedMetadata) {
      return coercePrimitiveValue(value, parameter.metatype);
    }

    const service = resolveValidationService();
    const parsedValue = await service.validate(resolvedMetadata.schema, value, context);

    if (resolvedMetadata.origin === "dto") {
      return assignToMetatype(parsedValue, parameter.metatype);
    }

    return parsedValue;
  }
}

export const createDefaultValidationPipe = (): SchemaValidationPipe => {
  return new SchemaValidationPipe();
};