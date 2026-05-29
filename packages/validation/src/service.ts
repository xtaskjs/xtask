import type { RouteExecutionContext } from "@xtaskjs/common";
import { createAdapterByName, isNormalizedValidationSchema } from "./adapters";
import { getValidationConfiguration } from "./configuration";
import type { ValidationAdapter, ValidationServiceLike } from "./types";

export class ValidationService implements ValidationServiceLike {
  private resolveAdapter(): ValidationAdapter {
    const configuration = getValidationConfiguration();
    return configuration.adapter || createAdapterByName(configuration.defaultAdapter);
  }

  async validate(schema: unknown, value: unknown, context?: RouteExecutionContext): Promise<unknown> {
    const configuration = getValidationConfiguration();
    const result = isNormalizedValidationSchema(schema)
      ? await schema.validate(value)
      : await this.resolveAdapter().validate(schema, value);

    if ("issues" in result) {
      throw configuration.createError(result.issues, context);
    }

    return result.data;
  }
}