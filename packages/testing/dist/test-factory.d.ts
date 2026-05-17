import { TestingModuleBuilder } from "./testing-module.builder";
import { TestingModuleMetadata, Type } from "./types";
export declare class Test {
    static createTestingModule(moduleOrMetadata: Type | TestingModuleMetadata): TestingModuleBuilder;
}
