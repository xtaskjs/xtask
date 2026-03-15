import { RouteExecutionContext, RouteParameterMetadata } from "../types";

type ClassTransformerModule = typeof import("class-transformer");
type ClassValidatorModule = typeof import("class-validator");
type ClassTransformOptions = import("class-transformer").ClassTransformOptions;
type ValidatorOptions = import("class-validator").ValidatorOptions;
type ValidationError = import("class-validator").ValidationError;

export interface ValidationPipeOptions {
  transformOptions?: ClassTransformOptions;
  validatorOptions?: ValidatorOptions;
}

type HttpErrorLike = Error & {
  statusCode: number;
  payload?: any;
};

const INTERNAL_STATE_KEYS = {
  argumentIndex: "__xtaskArgumentIndex",
  routeParameters: "__xtaskRouteParameters",
} as const;

const PRIMITIVE_METATYPES = new Set<any>([String, Boolean, Number, Array, Object, Date]);

const loadValidationModules = (): {
  transformer: ClassTransformerModule;
  validator: ClassValidatorModule;
} => {
  try {
    return {
      transformer: require("class-transformer") as ClassTransformerModule,
      validator: require("class-validator") as ClassValidatorModule,
    };
  } catch {
    const error = new Error(
      "ValidationPipe requires class-transformer and class-validator. Install them with: npm install class-transformer class-validator"
    ) as HttpErrorLike;
    error.statusCode = 500;
    throw error;
  }
};

const formatValidationErrors = (errors: ValidationError[]): any[] => {
  return errors.map((error) => ({
    property: error.property,
    constraints: Object.values(error.constraints || {}),
    children: error.children?.length ? formatValidationErrors(error.children) : undefined,
  }));
};

const collectValidationFields = (
  errors: ValidationError[],
  parentPath = ""
): string[] => {
  const fields: string[] = [];

  for (const error of errors) {
    const fieldPath = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints && Object.keys(error.constraints).length > 0) {
      fields.push(fieldPath);
    }

    if (error.children?.length) {
      fields.push(...collectValidationFields(error.children, fieldPath));
    }
  }

  return [...new Set(fields)];
};

const isValidationCandidate = (parameter?: RouteParameterMetadata): boolean => {
  if (!parameter?.metatype) {
    return false;
  }

  if (parameter.source === "request" || parameter.source === "response") {
    return false;
  }

  return !PRIMITIVE_METATYPES.has(parameter.metatype);
};

const coercePrimitiveValue = (value: any, metatype?: any): any => {
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

const createValidationError = (errors: ValidationError[]): HttpErrorLike => {
  const error = new Error("Validation failed") as HttpErrorLike;
  error.statusCode = 400;
  error.payload = {
    message: "Validation failed",
    fields: collectValidationFields(errors),
    errors: formatValidationErrors(errors),
  };
  return error;
};

export class ValidationPipe {
  private readonly transformOptions?: ClassTransformOptions;
  private readonly validatorOptions?: ValidatorOptions;

  constructor(options: ValidationPipeOptions = {}) {
    this.transformOptions = options.transformOptions;
    this.validatorOptions = options.validatorOptions;
  }

  async transform(value: any, context: RouteExecutionContext): Promise<any> {
    const argumentIndex = context.state[INTERNAL_STATE_KEYS.argumentIndex];
    const routeParameters = context.state[INTERNAL_STATE_KEYS.routeParameters] as
      | RouteParameterMetadata[]
      | undefined;

    const parameter = routeParameters?.find((candidate) => candidate.index === argumentIndex);
    if (!parameter) {
      return value;
    }

    if (!isValidationCandidate(parameter)) {
      return coercePrimitiveValue(value, parameter.metatype);
    }

    const { transformer, validator } = loadValidationModules();
    const instance = transformer.plainToInstance(parameter.metatype, value ?? {}, {
      enableImplicitConversion: true,
      ...this.transformOptions,
    });
    const errors = await validator.validate(instance, {
      whitelist: true,
      forbidUnknownValues: false,
      ...this.validatorOptions,
    });

    if (errors.length > 0) {
      throw createValidationError(errors);
    }

    return instance;
  }
}