"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Container = void 0;
require("reflect-metadata");
const component_1 = require("./component");
const lifecycle_1 = require("./lifecycle");
const fs_1 = require("fs");
const path_1 = require("path");
const autowired_1 = require("./autowired");
const qualifier_1 = require("./qualifier");
const server_1 = require("../server");
const common_1 = require("@xtaskjs/common");
class Container {
    constructor() {
        this.providers = new Map();
        this.singletons = new Map();
        this.nameToType = new Map();
        this.typeToNames = new Map();
        this.primaryBeans = new Map();
        this.namedInstances = new Map();
        this.resolving = new Set();
        this.managedInstances = [];
        this.ignoredDirs = new Set([
            "node_modules",
            ".git",
            "coverage",
            "dist",
            "build",
            "out",
        ]);
        this.registerWithName(common_1.Logger, { scope: "singleton" }, common_1.Logger.name);
    }
    // SCAN FOLDER BASE DIR FOR @Service() AND @Component()
    async autoload(baseDir = "packages") {
        const scanRoot = (0, path_1.join)(process.cwd(), baseDir);
        const root = (0, fs_1.existsSync)(baseDir) ? baseDir : scanRoot;
        const files = await this.scanDir(root);
        const seenConstructors = new Set();
        for (const file of files) {
            const name = file.toString();
            if (name.endsWith(".d.ts"))
                continue;
            if (/(^|\/)index\.(ts|js)$/.test(name))
                continue;
            if (/\.(test|spec)\.(ts|js)$/.test(name))
                continue;
            const module = await Promise.resolve(`${file}`).then(s => __importStar(require(s)));
            const exportedValues = Object.values(module);
            for (const exportedValue of exportedValues) {
                if (typeof exportedValue !== "function") {
                    continue;
                }
                const classConstructor = exportedValue;
                const hasComponentMetadata = Boolean((0, component_1.getComponentMetadata)(classConstructor));
                const hasControllerMetadata = Boolean(Reflect.getMetadata(common_1.CONTROLLERS_KEY, classConstructor));
                if (!hasComponentMetadata && !hasControllerMetadata) {
                    continue;
                }
                if (seenConstructors.has(classConstructor)) {
                    continue;
                }
                seenConstructors.add(classConstructor);
                const metaData = (0, component_1.getComponentMetadata)(classConstructor) || { scope: "singleton" };
                const beanName = metaData.name || classConstructor.name;
                this.registerWithName(classConstructor, metaData, beanName);
            }
        }
    }
    registerWithName(target, meta, name) {
        if (name) {
            this.nameToType.set(name, target);
            const existingNames = this.typeToNames.get(target) || [];
            existingNames.push(name);
            this.typeToNames.set(target, existingNames);
        }
        if (meta.primary) {
            this.primaryBeans.set(target, target);
        }
        this.register(target, meta);
    }
    // Register aa class with the container
    register(target, meta) {
        const paramTypes = Reflect.getMetadata("design:paramtypes", target) || [];
        if (process.env.NODE_ENV !== "test") {
            console.log(`Registering component: ${target.name} with dependencies:`, paramTypes.map(t => t?.name || 'unknown'));
        }
        const provider = () => {
            if (this.resolving.has(target)) {
                const resolvingNames = Array.from(this.resolving).map(t => t.name || 'unknown').join(" -> ");
                throw new Error(`Circular dependency detected: ${resolvingNames} -> ${target.name}`);
            }
            this.resolving.add(target);
            try {
                const qualifiers = (0, qualifier_1.getConstructorQualifiers)(target);
                const dependencies = paramTypes.map((dep, index) => {
                    const qualifier = qualifiers?.[index];
                    return this.getWithQualifier(dep, qualifier);
                });
                const instance = new target(...dependencies);
                this.injectAutoWiredFields(instance);
                //PostConstruct
                const postMethod = (0, lifecycle_1.getPostConstructMethod)(instance);
                if (postMethod && typeof instance[postMethod] === "function") {
                    instance[postMethod]();
                }
                //PreDestroy
                const preMethod = (0, lifecycle_1.getPreDestroyMethod)(instance);
                if (preMethod && typeof instance[preMethod] === "function") {
                    this.managedInstances.push({
                        instance,
                        preDestroy: () => instance[preMethod](),
                    });
                }
                return instance;
            }
            finally {
                this.resolving.delete(target);
            }
        };
        if (meta.scope === "transient") {
            this.providers.set(target, provider);
        }
        else { //singleton by default
            this.providers.set(target, () => {
                if (!this.singletons.has(target)) {
                    const instance = provider();
                    this.singletons.set(target, instance);
                }
                return this.singletons.get(target);
            });
        }
    }
    getByName(name) {
        if (this.namedInstances.has(name)) {
            return this.namedInstances.get(name);
        }
        const type = this.nameToType.get(name);
        if (!type) {
            throw new Error(`No component found with name: ${name}`);
        }
        return this.get(type);
    }
    registerNamedInstance(name, instance) {
        if (!name) {
            throw new Error("Named instance requires a non-empty name");
        }
        this.namedInstances.set(name, instance);
    }
    getWithQualifier(type, qualifier) {
        if (qualifier) {
            return this.getByName(qualifier);
        }
        return this.get(type);
    }
    injectAutoWiredFields(instance) {
        const autoWiredProperties = (0, autowired_1.getAutoWiredProperties)(instance);
        autoWiredProperties.forEach((metaData, propertyKey) => {
            try {
                let value;
                if (metaData.qualifier) {
                    value = this.getByName(metaData.qualifier);
                }
                else {
                    value = this.get(metaData.type);
                }
                instance[propertyKey] = value;
            }
            catch (error) {
                if (metaData.required) {
                    throw new Error(`Failed to inject required dependency for property "${String(propertyKey)}": ${error.message}`);
                }
            }
        });
    }
    // Get instance of class
    get(target) {
        const provider = this.providers.get(target);
        if (!provider) {
            throw new Error(`No provider found for ${target.name}`);
        }
        return provider();
    }
    // Execute all @PreDestroy in reverse order
    destroy() {
        this.managedInstances.reverse().forEach((m) => m.preDestroy?.());
        this.managedInstances = [];
        this.namedInstances.clear();
        this.singletons.clear();
        this.providers.clear();
    }
    // Scan folder recursively for .ts or .js files
    async scanDir(dir) {
        let results = [];
        if (!(0, fs_1.existsSync)(dir)) {
            return results;
        }
        for (const file of (0, fs_1.readdirSync)(dir)) {
            const full = (0, path_1.join)(dir, file);
            const stat = (0, fs_1.statSync)(full);
            if (stat && stat.isDirectory()) {
                if (this.ignoredDirs.has(file)) {
                    continue;
                }
                const res = await this.scanDir(full);
                results = results.concat(res);
            }
            else if (/\.(ts|js)$/.test(file)) {
                results.push(full);
            }
        }
        return results;
    }
    registerLifeCycleListeners(app) {
        for (const [type] of this.providers.entries()) {
            // Check if class has lifecycle decorators
            const handlers = Reflect.getMetadata(common_1.HANDLERS_KEY, type) || [];
            const runners = Reflect.getMetadata(common_1.RUNNERS_KEY, type) || [];
            const controller = Reflect.getMetadata(common_1.CONTROLLERS_KEY, type);
            const routes = Reflect.getMetadata(common_1.ROUTES_KEY, type) || [];
            if (handlers.length > 0 || runners.length > 0 || (controller && routes.length > 0)) {
                const instance = this.get(type);
                (0, server_1.registerEventHandlers)(instance, app);
                (0, server_1.registerControllerRoutes)(instance, app);
            }
        }
    }
}
exports.Container = Container;
