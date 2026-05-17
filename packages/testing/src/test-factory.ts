import { TestingModuleBuilder } from "./testing-module.builder";
import { TestingModuleMetadata, Type } from "./types";

export class Test {
  static createTestingModule(moduleOrMetadata: Type | TestingModuleMetadata): TestingModuleBuilder {
    return new TestingModuleBuilder(moduleOrMetadata);
  }
}
