import {
  clearHttpIntegrationResolverOverridesForTesting,
  createGlobalValidationPipe,
  setHttpIntegrationResolverOverridesForTesting,
} from "../../src/http/application";
import { SchemaValidationPipe } from "@xtaskjs/validation";

describe("createGlobalValidationPipe", () => {
  afterEach(() => {
    clearHttpIntegrationResolverOverridesForTesting();
  });

  test("prefers @xtaskjs/validation when it is available", () => {
    setHttpIntegrationResolverOverridesForTesting({
      validationCreateGlobalPipe: () => new SchemaValidationPipe(),
    });

    const pipe = createGlobalValidationPipe();

    expect(pipe).toBeInstanceOf(SchemaValidationPipe);
  });
});