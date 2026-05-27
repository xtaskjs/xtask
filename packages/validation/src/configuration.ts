import type { RouteExecutionContext } from "@xtaskjs/common";
import type {
  RegisteredValidationConfiguration,
  ValidationConfiguration,
  ValidationHttpError,
  ValidationIssue,
} from "./types";

const toFields = (issues: ValidationIssue[]): string[] => {
  return [...new Set(issues.map((issue) => issue.path || "$"))];
};

const defaultCreateError = (
  issues: ValidationIssue[],
  _context?: RouteExecutionContext
): ValidationHttpError => {
  const error = new Error("Validation failed") as ValidationHttpError;
  error.statusCode = 400;
  error.payload = {
    message: "Validation failed",
    fields: toFields(issues),
    errors: issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
      code: issue.code,
      vendor: issue.vendor,
    })),
  };
  return error;
};

let configuration: RegisteredValidationConfiguration = {
  defaultAdapter: "zod",
  createError: defaultCreateError,
};

export const configureValidation = (
  value: ValidationConfiguration
): RegisteredValidationConfiguration => {
  configuration = {
    ...configuration,
    ...(value.defaultAdapter ? { defaultAdapter: value.defaultAdapter } : {}),
    ...(value.adapter ? { adapter: value.adapter } : {}),
    ...(value.createError ? { createError: value.createError } : {}),
  };

  return getValidationConfiguration();
};

export const getValidationConfiguration = (): RegisteredValidationConfiguration => ({
  ...configuration,
});

export const resetValidationConfiguration = (): void => {
  configuration = {
    defaultAdapter: "zod",
    createError: defaultCreateError,
  };
};