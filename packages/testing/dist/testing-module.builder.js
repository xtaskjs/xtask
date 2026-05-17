"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestingModuleBuilder = exports.ProviderOverrideBuilder = void 0;
require("reflect-metadata");
const core_1 = require("@xtaskjs/core");
const module_1 = require("./module");
const testing_module_1 = require("./testing-module");
const asTokenName = (token) => {
    if (typeof token === "string") {
        return token;
    }
    if (typeof token === "symbol") {
        return token.description || token.toString();
    }
    return token?.name || "unknown";
};
const isClass = (value) => {
    return typeof value === "function";
};
const isClassProvider = (provider) => {
    return typeof provider === "object" && provider !== null && "useClass" in provider;
};
const isValueProvider = (provider) => {
    return typeof provider === "object" && provider !== null && "useValue" in provider;
};
const isFactoryProvider = (provider) => {
    return typeof provider === "object" && provider !== null && "useFactory" in provider;
};
class InMemoryRuntimeInjector {
    constructor() {
        this.records = new Map();
        this.nameAliases = new Map();
        this.resolving = new Set();
        this.preDestroyQueue = [];
    }
    register(provider) {
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
    has(token) {
        return this.resolveToken(token) !== undefined;
    }
    get(token) {
        const resolvedToken = this.resolveToken(token);
        if (!resolvedToken) {
            if (isClass(token)) {
                this.register(token);
                return this.get(token);
            }
            throw new Error(`No provider found for token '${asTokenName(token)}'`);
        }
        return this.resolveRecord(resolvedToken);
    }
    destroy() {
        for (let i = this.preDestroyQueue.length - 1; i >= 0; i -= 1) {
            this.preDestroyQueue[i]();
        }
        this.preDestroyQueue.length = 0;
        this.records.clear();
        this.resolving.clear();
        this.nameAliases.clear();
    }
    resolveToken(token) {
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
    resolveRecord(token) {
        const record = this.records.get(token);
        if (!record) {
            throw new Error(`No provider record found for token '${asTokenName(token)}'`);
        }
        if (record.scope === "singleton" && record.created) {
            return record.instance;
        }
        if (this.resolving.has(token)) {
            const chain = [...this.resolving.values()].map((current) => asTokenName(current)).join(" -> ");
            throw new Error(`Circular dependency detected: ${chain} -> ${asTokenName(token)}`);
        }
        this.resolving.add(token);
        try {
            const value = record.factory();
            if (record.scope === "singleton") {
                record.created = true;
                record.instance = value;
            }
            return value;
        }
        finally {
            this.resolving.delete(token);
        }
    }
    toDescriptor(provider) {
        if (isClass(provider)) {
            return {
                token: provider,
                provider,
                componentMeta: (0, core_1.getComponentMetadata)(provider),
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
                componentMeta: (0, core_1.getComponentMetadata)(provider.useClass),
            };
        }
        return {
            token,
            provider,
        };
    }
    createRecord(descriptor) {
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
    classRecord(token, target, scope) {
        return {
            token,
            scope,
            created: false,
            factory: () => this.instantiateClass(target),
        };
    }
    instantiateClass(target) {
        const paramTypes = Reflect.getMetadata("design:paramtypes", target) || [];
        const qualifiers = (0, core_1.getConstructorQualifiers)(target) || {};
        const dependencies = paramTypes.map((dependency, index) => {
            const qualifier = qualifiers[index];
            if (qualifier) {
                return this.get(qualifier);
            }
            return this.get(dependency);
        });
        const instance = new target(...dependencies);
        this.injectAutoWiredProperties(instance);
        const postConstructMethod = (0, core_1.getPostConstructMethod)(instance);
        if (postConstructMethod && typeof instance[postConstructMethod] === "function") {
            instance[postConstructMethod]();
        }
        const preDestroyMethod = (0, core_1.getPreDestroyMethod)(instance);
        if (preDestroyMethod && typeof instance[preDestroyMethod] === "function") {
            this.preDestroyQueue.push(() => instance[preDestroyMethod]());
        }
        return instance;
    }
    injectAutoWiredProperties(instance) {
        const properties = (0, core_1.getAutoWiredProperties)(instance);
        properties.forEach((metadata, propertyKey) => {
            try {
                const value = metadata.qualifier ? this.get(metadata.qualifier) : this.get(metadata.type);
                instance[propertyKey] = value;
            }
            catch (error) {
                if (!metadata.required) {
                    return;
                }
                const message = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to inject required dependency '${String(propertyKey)}': ${message}`);
            }
        });
    }
    resolveScope(local, metadataScope) {
        if (local === "singleton" || local === "transient") {
            return local;
        }
        if (metadataScope === "transient") {
            return "transient";
        }
        return "singleton";
    }
}
class ProviderOverrideBuilder {
    constructor(builder, token) {
        this.builder = builder;
        this.token = token;
    }
    useValue(value) {
        this.builder.setOverride({ provide: this.token, useValue: value });
        return this.builder;
    }
    useClass(target, scope) {
        this.builder.setOverride({ provide: this.token, useClass: target, scope });
        return this.builder;
    }
    useFactory(factory, inject = [], scope) {
        this.builder.setOverride({ provide: this.token, useFactory: factory, inject, scope });
        return this.builder;
    }
}
exports.ProviderOverrideBuilder = ProviderOverrideBuilder;
class TestingModuleBuilder {
    constructor(rootModule) {
        this.rootModule = rootModule;
        this.overrides = new Map();
    }
    overrideProvider(token) {
        return new ProviderOverrideBuilder(this, token);
    }
    setOverride(override) {
        this.overrides.set(override.provide, override);
    }
    async compile() {
        const injector = new InMemoryRuntimeInjector();
        const providers = this.collectProviders(this.rootModule);
        for (const provider of providers) {
            injector.register(provider);
        }
        for (const override of this.overrides.values()) {
            injector.register(override);
        }
        return new testing_module_1.TestingModule(injector);
    }
    collectProviders(moduleInput, visited = new Set()) {
        const metadata = this.resolveModuleMetadata(moduleInput, visited);
        const providers = [];
        const imports = metadata.imports || [];
        for (const importedModule of imports) {
            const importedProviders = this.collectProviders(importedModule, visited);
            providers.push(...importedProviders);
        }
        providers.push(...(metadata.providers || []));
        return providers;
    }
    resolveModuleMetadata(moduleInput, visited) {
        if (!isClass(moduleInput)) {
            return moduleInput;
        }
        if (visited.has(moduleInput)) {
            return { providers: [] };
        }
        visited.add(moduleInput);
        const metadata = (0, module_1.getModuleMetadata)(moduleInput);
        if (!metadata) {
            return { providers: [moduleInput] };
        }
        return metadata;
    }
}
exports.TestingModuleBuilder = TestingModuleBuilder;
