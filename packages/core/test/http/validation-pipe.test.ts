import {
  clearHttpIntegrationResolverOverridesForTesting,
  createGlobalValidationPipe,
  setHttpIntegrationResolverOverridesForTesting,
} from "../../src/http/application";

class TestValidationPipe {
  transform(value: unknown): unknown {
    return value;
  }
}

describe("createGlobalValidationPipe", () => {
  afterEach(() => {
    clearHttpIntegrationResolverOverridesForTesting();
  });

  test("prefers @xtaskjs/validation when it is available", () => {
    setHttpIntegrationResolverOverridesForTesting({
      validationCreateGlobalPipe: () => new TestValidationPipe(),
    });

    const pipe = createGlobalValidationPipe();

    expect(pipe).toBeInstanceOf(TestValidationPipe);
  });
});