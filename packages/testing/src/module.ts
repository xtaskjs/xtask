import "reflect-metadata";
import { TestingModuleMetadata, Type } from "./types";

const TESTING_MODULE_METADATA_KEY = Symbol("xtaskjs:testing:module");

export function Module(metadata: TestingModuleMetadata): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(TESTING_MODULE_METADATA_KEY, metadata, target);
  };
}

export function getModuleMetadata(target: Type): TestingModuleMetadata | undefined {
  return Reflect.getMetadata(TESTING_MODULE_METADATA_KEY, target);
}
