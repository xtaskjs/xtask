import "reflect-metadata";
import { TestingModuleMetadata, Type } from "./types";
export declare function Module(metadata: TestingModuleMetadata): ClassDecorator;
export declare function getModuleMetadata(target: Type): TestingModuleMetadata | undefined;
