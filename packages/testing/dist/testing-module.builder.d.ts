import "reflect-metadata";
import { TestingModule } from "./testing-module";
import { InjectionToken, ProviderOverride, ProviderScope, TestingModuleMetadata, Type } from "./types";
export declare class ProviderOverrideBuilder<T = any> {
    private readonly builder;
    private readonly token;
    constructor(builder: TestingModuleBuilder, token: InjectionToken<T>);
    useValue(value: T): TestingModuleBuilder;
    useClass(target: Type<T>, scope?: ProviderScope): TestingModuleBuilder;
    useFactory(factory: (...dependencies: any[]) => T, inject?: InjectionToken[], scope?: ProviderScope): TestingModuleBuilder;
}
export declare class TestingModuleBuilder {
    private readonly rootModule;
    private readonly overrides;
    constructor(rootModule: Type | TestingModuleMetadata);
    overrideProvider<T = any>(token: InjectionToken<T>): ProviderOverrideBuilder<T>;
    setOverride(override: ProviderOverride): void;
    compile(): Promise<TestingModule>;
    private collectProviders;
    private resolveModuleMetadata;
}
