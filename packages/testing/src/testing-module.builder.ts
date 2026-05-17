import "reflect-metadata";
import {
  getAutoWiredProperties,
  getComponentMetadata,
  getConstructorQualifiers,
  getPostConstructMethod,
  getPreDestroyMethod,
} from "@xtaskjs/core";
import { getModuleMetadata } from "./module";
import { RuntimeInjector, TestingModule } from "./testing-module";
import {
  ClassProvider,
  FactoryProvider,
  InjectionToken,
  Provider,
  ProviderDescriptor,
  ProviderOverride,
  ProviderScope,
  RuntimeProviderRecord,
  TestingModuleMetadata,
  Type,
  ValueProvider,
} from "./types";

const asTokenName = (token: InjectionToken): string => {
  if (typeof token === "string") {
    return token;
  }
  if (typeof token === "symbol") {
    return token.description || token.toString();
  }
  return token?.name || "unknown";
};

const isClass = (value: unknown): value is Type => {
  return typeof value === "function";
};

const isClassProvider = (provider: Provider | ProviderOverride): provider is ClassProvider => {
  return typeof provider === "object" && provider !== null && "useClass" in provider;
};

const isValueProvider = (provider: Provider | ProviderOverride): provider is ValueProvider => {
  return typeof provider === "object" && provider !== null && "useValue" in provider;
};

const isFactoryProvider = (provider: Provider | ProviderOverride): provider is FactoryProvider => {
  return typeof provider === "object" && provider !== null && "useFactory" in provider;
};

class InMemoryRuntimeInjector implements RuntimeInjector {
  private readonly records = new Map<InjectionToken, RuntimeProviderRecord>();
  private readonly nameAliases = new Map<string, InjectionToken>();
  private readonly resolving = new Set<InjectionToken>();
  private readonly preDestroyQueue: Array<() => void> = [];

  register(provider: Provider | ProviderOverride): void {
    const descriptor = this.toDescriptor(provider);
    const record = this.createRecord(descriptor);

    this.records.set(descriptor.token, record);

    if (typeof descriptor.token === "string") {
      this.nameAliases.set(descriptor.token, descriptor.token);
    }

    if (descriptor.componentMeta?.name) {
      this.nameAliases.set(descriptor.componentMeta.name, descriptor.token);
    }
  }

  has(token: InjectionToken): boolean {
    return this.resolveToken(token) !== undefined;
  }

  get<T>(token: InjectionToken<T>): T {
    const resolvedToken = this.resolveToken(token);
    if (!resolvedToken) {
      if (isClass(token)) {
        this.register(token);
        return this.get(token);
      }
      throw new Error(`No provider found for token '${asTokenName(token)}'`);
    }

    return this.resolveRecord<T>(resolvedToken);
  }

  destroy(): void {
    for (let i = this.preDestroyQueue.length - 1; i >= 0; i -= 1) {
      this.preDestroyQueue[i]();
    }
    this.preDestroyQueue.length = 0;
    this.records.clear();
    this.resolving.clear();
    this.nameAliases.clear();
  }

  private resolveToken(token: InjectionToken): InjectionToken | undefined {
    if (this.records.has(token)) {
      return token;
    }

    if (typeof token === "string") {
      const mapped = this.nameAliases.get(token);
      if (mapped && this.records.has(mapped)) {
        return mapped;
      }
    }

    return undefined;
  }

  private resolveRecord<T>(token: InjectionToken<T>): T {
    const record = this.records.get(token);
    if (!record) {
      throw new Error(`No provider record found for token '${asTokenName(token)}'`);
    }

    if (record.scope === "singleton" && record.created) {
      return record.instance as T;
    }

    if (this.resolving.has(token)) {
      const chain = [...this.resolving.values()].map((current) => asTokenName(current)).join(" -> ");
      throw new Error(`Circular dependency detected: ${chain} -> ${asTokenName(token)}`);
    }

    this.resolving.add(token);
    try {
      const value = record.factory() as T;
      if (record.scope === "singleton") {
        record.created = true;
        record.instance = value;
      }
      return value;
    } finally {
      this.resolving.delete(token);
    }
  }

  private toDescriptor(provider: Provider | ProviderOverride): ProviderDescriptor {
    if (isClass(provider)) {
      return {
        token: provider,
        provider,
        componentMeta: getComponentMetadata(provider),
      };
    }

    const token = provider.provide;
    if (!token) {
      throw new Error("Providers must define a token with 'provide'");
    }

    if (isClassProvider(provider)) {
      return {
        token,
        provider,
        componentMeta: getComponentMetadata(provider.useClass),
      };
    }

    return {
      token,
      provider,
    };
  }

  private createRecord(descriptor: ProviderDescriptor): RuntimeProviderRecord {
    const { token, provider, componentMeta } = descriptor;

    if (isClass(provider)) {
      const scope = componentMeta?.scope === "transient" ? "transient" : "singleton";
      return this.classRecord(token, provider, scope);
    }

    if (isClassProvider(provider)) {
      const scope = this.resolveScope(provider.scope, componentMeta?.scope);
      return this.classRecord(token, provider.useClass, scope);
    }

    if (isValueProvider(provider)) {
      return {
        token,
        scope: "singleton",
        factory: () => provider.useValue,
        created: true,
        instance: provider.useValue,
      };
    }

    if (isFactoryProvider(provider)) {
      const scope = this.resolveScope(provider.scope);
      return {
        token,
        scope,
        factory: () => {
          const inject = provider.inject || [];
          const dependencies = inject.map((dependencyToken) => this.get(dependencyToken));
          return provider.useFactory(...dependencies);
        },
        created: false,
      };
    }

    throw new Error(`Unsupported provider definition for token '${asTokenName(token)}'`);
  }

  private classRecord(token: InjectionToken, target: Type, scope: ProviderScope): RuntimeProviderRecord {
    return {
      token,
      scope,
      created: false,
      factory: () => this.instantiateClass(target),
    };
  }

  private instantiateClass<T>(target: Type<T>): T {
    const paramTypes: Type[] = Reflect.getMetadata("design:paramtypes", target) || [];
    const qualifiers = getConstructorQualifiers(target) || {};

    const dependencies = paramTypes.map((dependency, index) => {
      const qualifier = qualifiers[index];
      if (qualifier) {
        return this.get(qualifier);
      }
      return this.get(dependency);
    });

    const instance = new target(...dependencies);
    this.injectAutoWiredProperties(instance);

    const postConstructMethod = getPostConstructMethod(instance);
    if (postConstructMethod && typeof (instance as any)[postConstructMethod] === "function") {
      (instance as any)[postConstructMethod]();
    }

    const preDestroyMethod = getPreDestroyMethod(instance);
    if (preDestroyMethod && typeof (instance as any)[preDestroyMethod] === "function") {
      this.preDestroyQueue.push(() => (instance as any)[preDestroyMethod]());
    }

    return instance;
  }

  private injectAutoWiredProperties(instance: any): void {
    const properties = getAutoWiredProperties(instance);
    properties.forEach((metadata, propertyKey) => {
      try {
        const value = metadata.qualifier ? this.get(metadata.qualifier) : this.get(metadata.type);
        instance[propertyKey] = value;
      } catch (error) {
        if (!metadata.required) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to inject required dependency '${String(propertyKey)}': ${message}`);
      }
    });
  }

  private resolveScope(local?: ProviderScope, metadataScope?: "singleton" | "transient"): ProviderScope {
    if (local === "singleton" || local === "transient") {
      return local;
    }
    if (metadataScope === "transient") {
      return "transient";
    }
    return "singleton";
  }
}

export class ProviderOverrideBuilder<T = any> {
  constructor(
    private readonly builder: TestingModuleBuilder,
    private readonly token: InjectionToken<T>
  ) {}

  useValue(value: T): TestingModuleBuilder {
    this.builder.setOverride({ provide: this.token, useValue: value });
    return this.builder;
  }

  useClass(target: Type<T>, scope?: ProviderScope): TestingModuleBuilder {
    this.builder.setOverride({ provide: this.token, useClass: target, scope });
    return this.builder;
  }

  useFactory(
    factory: (...dependencies: any[]) => T,
    inject: InjectionToken[] = [],
    scope?: ProviderScope
  ): TestingModuleBuilder {
    this.builder.setOverride({ provide: this.token, useFactory: factory, inject, scope });
    return this.builder;
  }
}

export class TestingModuleBuilder {
  private readonly overrides = new Map<InjectionToken, ProviderOverride>();

  constructor(private readonly rootModule: Type | TestingModuleMetadata) {}

  overrideProvider<T = any>(token: InjectionToken<T>): ProviderOverrideBuilder<T> {
    return new ProviderOverrideBuilder<T>(this, token);
  }

  setOverride(override: ProviderOverride): void {
    this.overrides.set(override.provide, override);
  }

  async compile(): Promise<TestingModule> {
    const injector = new InMemoryRuntimeInjector();
    const providers = this.collectProviders(this.rootModule);

    for (const provider of providers) {
      injector.register(provider);
    }

    for (const override of this.overrides.values()) {
      injector.register(override);
    }

    return new TestingModule(injector);
  }

  private collectProviders(
    moduleInput: Type | TestingModuleMetadata,
    visited = new Set<Type>()
  ): Provider[] {
    const metadata = this.resolveModuleMetadata(moduleInput, visited);
    const providers: Provider[] = [];

    const imports = metadata.imports || [];
    for (const importedModule of imports) {
      const importedProviders = this.collectProviders(importedModule, visited);
      providers.push(...importedProviders);
    }

    providers.push(...(metadata.providers || []));
    return providers;
  }

  private resolveModuleMetadata(
    moduleInput: Type | TestingModuleMetadata,
    visited: Set<Type>
  ): TestingModuleMetadata {
    if (!isClass(moduleInput)) {
      return moduleInput;
    }

    if (visited.has(moduleInput)) {
      return { providers: [] };
    }

    visited.add(moduleInput);
    const metadata = getModuleMetadata(moduleInput);
    if (!metadata) {
      return { providers: [moduleInput] };
    }

    return metadata;
  }
}
