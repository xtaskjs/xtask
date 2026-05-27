import type { RouteExecutionContext, RouteParameterSource } from "@xtaskjs/common";

export type ValidationSchemaSource = Extract<RouteParameterSource, "body" | "query" | "param">;

export interface ValidationIssue {
  path: string;
  message: string;
  code?: string;
  vendor?: string;
}

export type ValidationResult<T = unknown> =
  | { success: true; data: T; vendor?: string }
  | { success: false; issues: ValidationIssue[]; vendor?: string };

export interface ValidationHttpErrorPayload {
  message: string;
  fields: string[];
  errors: Array<{ path: string; message: string; code?: string; vendor?: string }>;
}

export type ValidationHttpError = Error & {
  statusCode: number;
  payload?: ValidationHttpErrorPayload;
};

export interface ValidationAdapter {
  name: string;
  validate(schema: unknown, value: unknown): Promise<ValidationResult>;
}

export interface NormalizedValidationSchema<T = unknown> {
  readonly __xtaskValidationSchema: true;
  readonly vendor: string;
  validate(value: unknown): Promise<ValidationResult<T>>;
}

export interface ValidationConfiguration {
  defaultAdapter?: "zod" | "valibot";
  adapter?: ValidationAdapter;
  createError?: (issues: ValidationIssue[], context?: RouteExecutionContext) => ValidationHttpError;
}

export interface RegisteredValidationConfiguration {
  defaultAdapter: "zod" | "valibot";
  adapter?: ValidationAdapter;
  createError: (issues: ValidationIssue[], context?: RouteExecutionContext) => ValidationHttpError;
}

export interface ValidationServiceLike {
  validate(schema: unknown, value: unknown, context?: RouteExecutionContext): Promise<unknown>;
}

export type ResolvedSchemaMetadata = {
  schema: unknown;
  origin: "parameter" | "source" | "dto";
};