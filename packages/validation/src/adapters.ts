import type {
  NormalizedValidationSchema,
  ValidationAdapter,
  ValidationIssue,
  ValidationResult,
} from "./types";

type ZodSchemaLike = {
  safeParseAsync: (value: unknown) => Promise<{
    success: boolean;
    data?: unknown;
    error?: { issues?: Array<{ path?: Array<string | number>; message?: string; code?: string }> };
  }>;
};

type ValibotModule = {
  safeParseAsync: (
    schema: unknown,
    input: unknown
  ) => Promise<{ success: boolean; output?: unknown; issues?: unknown[] }>;
};

const validationSchemaMarker = "__xtaskValidationSchema" as const;

const formatPath = (segments: Array<string | number> | undefined): string => {
  if (!segments || segments.length === 0) {
    return "$";
  }

  return segments
    .map((segment) => (typeof segment === "number" ? `[${segment}]` : segment))
    .join(".")
    .replace(/\.\[/g, "[");
};

const normalizeZodIssues = (issues: Array<{ path?: Array<string | number>; message?: string; code?: string }> = []): ValidationIssue[] => {
  return issues.map((issue) => ({
    path: formatPath(issue.path),
    message: issue.message || "Invalid value",
    code: issue.code,
    vendor: "zod",
  }));
};

const normalizeValibotPath = (input: unknown): string => {
  if (!Array.isArray(input) || input.length === 0) {
    return "$";
  }

  const segments = input
    .map((entry) => {
      if (typeof entry === "string" || typeof entry === "number") {
        return entry;
      }

      if (entry && typeof entry === "object") {
        const key = (entry as { key?: string | number }).key;
        const value = (entry as { value?: string | number }).value;
        if (key !== undefined) {
          return key;
        }
        if (value !== undefined) {
          return value;
        }
      }

      return undefined;
    })
    .filter((value): value is string | number => value !== undefined);

  return formatPath(segments);
};

const normalizeValibotIssues = (issues: unknown[] = []): ValidationIssue[] => {
  return issues.map((issue) => {
    const candidate = issue as {
      message?: string;
      type?: string;
      path?: unknown[];
      issues?: unknown[];
    };

    return {
      path: normalizeValibotPath(candidate.path),
      message: candidate.message || "Invalid value",
      code: candidate.type,
      vendor: "valibot",
    };
  });
};

const loadValibotModule = (): ValibotModule => {
  try {
    return require("valibot") as ValibotModule;
  } catch {
    throw new Error(
      "Valibot validation requires valibot. Install it with: npm install valibot"
    );
  }
};

export const isNormalizedValidationSchema = (
  value: unknown
): value is NormalizedValidationSchema => {
  return (
    value &&
      typeof value === "object" &&
      (value as { [validationSchemaMarker]?: boolean })[validationSchemaMarker] === true
  );
};

export const zodSchema = <T = unknown>(schema: ZodSchemaLike): NormalizedValidationSchema<T> => ({
  __xtaskValidationSchema: true,
  vendor: "zod",
  async validate(value: unknown): Promise<ValidationResult<T>> {
    const result = await schema.safeParseAsync(value);
    if (result.success) {
      return {
        success: true,
        data: result.data as T,
        vendor: "zod",
      };
    }

    return {
      success: false,
      issues: normalizeZodIssues(result.error?.issues),
      vendor: "zod",
    };
  },
});

export const valibotSchema = <T = unknown>(schema: unknown): NormalizedValidationSchema<T> => ({
  __xtaskValidationSchema: true,
  vendor: "valibot",
  async validate(value: unknown): Promise<ValidationResult<T>> {
    const module = loadValibotModule();
    const result = await module.safeParseAsync(schema, value);
    if (result.success) {
      return {
        success: true,
        data: result.output as T,
        vendor: "valibot",
      };
    }

    return {
      success: false,
      issues: normalizeValibotIssues(result.issues),
      vendor: "valibot",
    };
  },
});

export const createZodAdapter = (): ValidationAdapter => ({
  name: "zod",
  async validate(schema: unknown, value: unknown): Promise<ValidationResult> {
    if (!schema || typeof (schema as Partial<ZodSchemaLike>).safeParseAsync !== "function") {
      throw new Error("Zod adapter requires a Zod schema with safeParseAsync().");
    }

    return zodSchema(schema as ZodSchemaLike).validate(value);
  },
});

export const createValibotAdapter = (): ValidationAdapter => ({
  name: "valibot",
  async validate(schema: unknown, value: unknown): Promise<ValidationResult> {
    return valibotSchema(schema).validate(value);
  },
});

export const createAdapterByName = (name: "zod" | "valibot"): ValidationAdapter => {
  return name === "valibot" ? createValibotAdapter() : createZodAdapter();
};