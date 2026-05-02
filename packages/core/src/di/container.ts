import "reflect-metadata"
import { ComponentMetadata, getComponentMetadata } from "./component";
import { getPostConstructMethod, getPreDestroyMethod } from "./lifecycle";  
import { existsSync, readdirSync , statSync } from "fs";
import { join, normalize } from "path";
import { availableParallelism } from "os";
import { Worker } from "worker_threads";
import { pathToFileURL } from "url";
import { ManagedInstance } from "./managedinstance";
import { getAutoWiredProperties } from "./autowired";
import { getConstructorQualifiers } from "./qualifier";
import { registerControllerRoutes, registerEventHandlers} from "../server";
import { CONTROLLERS_KEY, HANDLERS_KEY, Logger, ROUTES_KEY, RUNNERS_KEY } from "@xtaskjs/common";

export type ResolutionStrategy = "lazy" | "eager";

export interface ContainerOptions {
    resolutionStrategy?: ResolutionStrategy;
    metricsEnabled?: boolean;
}

interface ContainerRuntimeOptions {
    resolutionStrategy: ResolutionStrategy;
    metricsEnabled: boolean;
}

interface ComponentMetricState {
    componentName: string;
    scope: "singleton" | "transient";
    instancesCreated: number;
    totalInstantiationNs: bigint;
    lastInstantiationNs: bigint;
}

export interface ComponentInstantiationMetrics {
    componentName: string;
    scope: "singleton" | "transient";
    instancesCreated: number;
    totalInstantiationMs: number;
    averageInstantiationMs: number;
    lastInstantiationMs: number;
}


export class Container{
    private providers = new Map<any, () => any>();
    private singletons = new Map<any, any>();
    private nameToType = new Map<string, any>();
    private typeToNames = new Map<any, string[]>();
    private primaryBeans = new Map<any, any>();
    private namedInstances = new Map<string, any>();
    private resolving = new Set<any>();
    public managedInstances : ManagedInstance[] = [];
    private readonly ignoredDirs = new Set([
        "node_modules",
        ".git",
        "coverage",
        "dist",
        "build",
        "out",
    ]);
    private readonly options: ContainerRuntimeOptions;
    private readonly registeredConstructors = new Set<any>();
    private readonly instantiationMetrics = new Map<any, ComponentMetricState>();
    private readonly typeToFile = new Map<any, string>();
    private readonly fileToTypes = new Map<string, Set<any>>();
    private readonly discoveryWorkerSource = `
const { parentPort, workerData } = require("worker_threads");
const { readFileSync } = require("fs");

const files = Array.isArray(workerData?.files) ? workerData.files : [];
const markerRegex = /(@Service\\b|@Component\\b|@Controller\\b|\\bService\\s*\\(|\\bComponent\\s*\\(|\\bController\\s*\\(|CONTROLLERS_KEY|getComponentMetadata)/;
const discovered = [];

for (const file of files) {
    try {
        const content = readFileSync(file, "utf-8");
        if (markerRegex.test(content)) {
            discovered.push(file);
        }
    } catch {
        discovered.push(file);
    }
}

parentPort.postMessage({ files: discovered });
`;

    constructor(options: ContainerOptions = {}) {
        this.options = {
            resolutionStrategy: options.resolutionStrategy || "lazy",
            metricsEnabled: options.metricsEnabled !== false,
        };
        this.registerWithName(Logger, { scope: "singleton" }, Logger.name);
    }

    private async importModule(file: string, forceRefresh = false): Promise<any> {
        if (forceRefresh) {
            const fileUrl = pathToFileURL(file);
            fileUrl.searchParams.set("xtaskHot", `${Date.now()}`);
            try {
                return await import(fileUrl.href);
            } catch {
                try {
                    const resolved = require.resolve(file);
                    delete require.cache[resolved];
                } catch {
                    // Best-effort cache busting.
                }
            }
        }

        return import(file);
    }

    private registerTypeFile(type: any, file: string): void {
        const normalizedFile = normalize(file);
        this.typeToFile.set(type, normalizedFile);
        const mappedTypes = this.fileToTypes.get(normalizedFile) || new Set<any>();
        mappedTypes.add(type);
        this.fileToTypes.set(normalizedFile, mappedTypes);
    }

    private unregisterType(type: any): void {
        const names = this.typeToNames.get(type) || [];
        for (const name of names) {
            this.nameToType.delete(name);
        }
        this.typeToNames.delete(type);
        this.primaryBeans.delete(type);
        this.providers.delete(type);
        this.singletons.delete(type);
        this.resolving.delete(type);
        this.registeredConstructors.delete(type);
        this.instantiationMetrics.delete(type);
        this.managedInstances = this.managedInstances.filter((entry) => entry.instance?.constructor !== type);

        const file = this.typeToFile.get(type);
        if (file) {
            const mappedTypes = this.fileToTypes.get(file);
            if (mappedTypes) {
                mappedTypes.delete(type);
                if (mappedTypes.size === 0) {
                    this.fileToTypes.delete(file);
                }
            }
        }
        this.typeToFile.delete(type);
    }

    public invalidate(targetOrName: any | string): void {
        if (!targetOrName) {
            return;
        }

        if (typeof targetOrName === "string") {
            const type = this.nameToType.get(targetOrName);
            if (type) {
                this.unregisterType(type);
            }
            this.namedInstances.delete(targetOrName);
            return;
        }

        this.unregisterType(targetOrName);
    }

    public async hotReloadFile(file: string): Promise<string[]> {
        const normalizedFile = normalize(file);
        const previousTypes = [...(this.fileToTypes.get(normalizedFile) || new Set<any>())];
        for (const type of previousTypes) {
            this.unregisterType(type);
        }

        await this.autoloadFiles([normalizedFile], { forceRefresh: true });
        return [...(this.fileToTypes.get(normalizedFile) || new Set<any>())].map((type) => type.name || "unknown");
    }

    public unregisterFile(file: string): string[] {
        const normalizedFile = normalize(file);
        const types = [...(this.fileToTypes.get(normalizedFile) || new Set<any>())];
        for (const type of types) {
            this.unregisterType(type);
        }
        return types.map((type) => type.name || "unknown");
    }

    private shouldUseLazyDependencies(): boolean {
        return this.options.resolutionStrategy === "lazy";
    }

    private asMilliseconds(value: bigint): number {
        return Number(value) / 1_000_000;
    }

    private recordInstantiationMetric(target: any, scope: "singleton" | "transient", startedAtNs: bigint): void {
        if (!this.options.metricsEnabled) {
            return;
        }
        const elapsedNs = process.hrtime.bigint() - startedAtNs;
        const existing = this.instantiationMetrics.get(target);
        if (existing) {
            existing.instancesCreated += 1;
            existing.totalInstantiationNs += elapsedNs;
            existing.lastInstantiationNs = elapsedNs;
            return;
        }

        this.instantiationMetrics.set(target, {
            componentName: target?.name || "unknown",
            scope,
            instancesCreated: 1,
            totalInstantiationNs: elapsedNs,
            lastInstantiationNs: elapsedNs,
        });
    }

    public getResolutionStrategy(): ResolutionStrategy {
        return this.options.resolutionStrategy;
    }

    public getInstantiationMetrics(): ComponentInstantiationMetrics[] {
        return Array.from(this.instantiationMetrics.values())
            .map((metric) => ({
                componentName: metric.componentName,
                scope: metric.scope,
                instancesCreated: metric.instancesCreated,
                totalInstantiationMs: this.asMilliseconds(metric.totalInstantiationNs),
                averageInstantiationMs: this.asMilliseconds(
                    metric.totalInstantiationNs / BigInt(metric.instancesCreated)
                ),
                lastInstantiationMs: this.asMilliseconds(metric.lastInstantiationNs),
            }))
            .sort((a, b) => b.totalInstantiationMs - a.totalInstantiationMs);
    }

    public resetInstantiationMetrics(): void {
        this.instantiationMetrics.clear();
    }

    private createLazyDependency<T>(resolver: () => T): T {
        let hasResolved = false;
        let resolvedValue: T;

        const ensureResolved = (): T => {
            if (!hasResolved) {
                resolvedValue = resolver();
                hasResolved = true;
            }
            return resolvedValue;
        };

        const proxyTarget = function lazyDependencyProxyTarget() {
            return undefined;
        };

        return new Proxy(proxyTarget as any, {
            get: (_target, property) => {
                const instance = ensureResolved() as any;
                const value = Reflect.get(instance, property, instance);
                return typeof value === "function" ? value.bind(instance) : value;
            },
            set: (_target, property, value) => {
                return Reflect.set(ensureResolved() as any, property, value);
            },
            has: (_target, property) => {
                return property in (ensureResolved() as any);
            },
            ownKeys: () => {
                return Reflect.ownKeys(ensureResolved() as any);
            },
            getOwnPropertyDescriptor: (_target, property) => {
                return Reflect.getOwnPropertyDescriptor(ensureResolved() as any, property);
            },
            defineProperty: (_target, property, attributes) => {
                return Reflect.defineProperty(ensureResolved() as any, property, attributes);
            },
            deleteProperty: (_target, property) => {
                return Reflect.deleteProperty(ensureResolved() as any, property);
            },
            getPrototypeOf: () => {
                return Reflect.getPrototypeOf(ensureResolved() as any);
            },
            setPrototypeOf: (_target, prototype) => {
                return Reflect.setPrototypeOf(ensureResolved() as any, prototype);
            },
            isExtensible: () => {
                return Reflect.isExtensible(ensureResolved() as any);
            },
            preventExtensions: () => {
                return Reflect.preventExtensions(ensureResolved() as any);
            },
            apply: (_target, thisArg, argsList) => {
                return Reflect.apply(ensureResolved() as any, thisArg, argsList);
            },
            construct: (_target, argsList, newTarget) => {
                return Reflect.construct(ensureResolved() as any, argsList, newTarget);
            },
        }) as T;
    }

    // SCAN FOLDER BASE DIR FOR @Service() AND @Component()

    async autoload(baseDir = "packages"){
        const scanRoot = join(process.cwd(), baseDir);
        const root = existsSync(baseDir) ? baseDir : scanRoot;
        const files = await this.scanDir(root);
        await this.autoloadFiles(files);
    }

    async autoloadFiles(files: string[], options: { forceRefresh?: boolean } = {}) {
        const candidates = files.filter((file) => this.isAutoloadCandidate(file));
        const discoverableFiles = await this.discoverAutoloadCandidates(candidates);
        const loadedModules = await Promise.all(
            discoverableFiles.map(async (file) => ({
                file,
                module: await this.importModule(file, options.forceRefresh === true),
            }))
        );

        for (const { file, module } of loadedModules) {
            const exportedValues = Object.values(module);

            for (const exportedValue of exportedValues) {
                if (typeof exportedValue !== "function") {
                    continue;
                }

                const classConstructor = exportedValue;
                const hasComponentMetadata = Boolean(getComponentMetadata(classConstructor));
                const hasControllerMetadata = Boolean(Reflect.getMetadata(CONTROLLERS_KEY, classConstructor));

                if (!hasComponentMetadata && !hasControllerMetadata) {
                    continue;
                }

                if (this.registeredConstructors.has(classConstructor)) {
                    continue;
                }

                this.registeredConstructors.add(classConstructor);
                const metaData = getComponentMetadata(classConstructor) || { scope: "singleton" };
                const beanName = metaData.name || classConstructor.name;
                this.registerWithName(classConstructor, metaData, beanName);
                this.registerTypeFile(classConstructor, file);
            }
        }
    }

    private async discoverAutoloadCandidates(files: string[]): Promise<string[]> {
        if (files.length <= 1) {
            return files;
        }

        const maxWorkers = this.resolveDiscoveryWorkerCount(files.length);
        const workerCount = Math.min(maxWorkers, files.length);
        const chunks = this.chunkFiles(files, workerCount);

        try {
            const discoveredGroups = await Promise.all(
                chunks.map((chunk) => this.runDiscoveryWorker(chunk))
            );
            const discovered = [...new Set(discoveredGroups.flat())];
            return discovered.length > 0 ? discovered : files;
        } catch {
            // Fallback to the original behavior if worker discovery fails.
            return files;
        }
    }

    private resolveDiscoveryWorkerCount(fileCount: number): number {
        const configured = process.env.XTASK_SCAN_WORKERS?.trim().toLowerCase();
        if (configured && configured !== "auto") {
            const parsed = Number(configured);
            if (Number.isFinite(parsed) && parsed >= 1) {
                return Math.max(1, Math.min(Math.floor(parsed), fileCount));
            }
        }

        return Math.max(1, availableParallelism());
    }

    private chunkFiles(files: string[], chunks: number): string[][] {
        const result: string[][] = Array.from({ length: chunks }, () => []);
        for (let i = 0; i < files.length; i++) {
            result[i % chunks].push(files[i]);
        }
        return result.filter((group) => group.length > 0);
    }

    private runDiscoveryWorker(files: string[]): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const worker = new Worker(this.discoveryWorkerSource, {
                workerData: { files },
                eval: true,
            });

            const timeout = setTimeout(() => {
                void worker.terminate();
                reject(new Error("Autoload discovery worker timed out"));
            }, 5000);

            worker.once("message", (message: { files?: string[] }) => {
                clearTimeout(timeout);
                resolve(Array.isArray(message?.files) ? message.files : []);
            });
            worker.once("error", (error: Error) => {
                clearTimeout(timeout);
                reject(error);
            });
            worker.once("exit", (code: number) => {
                clearTimeout(timeout);
                if (code !== 0) {
                    reject(new Error(`Autoload discovery worker exited with code ${code}`));
                }
            });
        });
    }

    private isAutoloadCandidate(file: string): boolean {
        if (file.endsWith(".d.ts")) return false;
        if (/(^|\/)index\.(ts|js)$/.test(file)) return false;
        if (/(^|\/)(app|main)\.(ts|js)$/.test(file)) return false;
        if (/\.(test|spec)\.(ts|js)$/.test(file)) return false;
        return true;
    }
        
 
    public registerWithName(target: any, meta: ComponentMetadata, name?: string){
        if (name){
             this.nameToType.set(name, target);
             const existingNames = this.typeToNames.get(target) || [];
             existingNames.push(name);
             this.typeToNames.set(target, existingNames);
        }

        if (meta.primary){
            this.primaryBeans.set(target,target);
        }

        this.register(target, meta);
    
    }

    // Register aa class with the container
    
    public register(target: any, meta: ComponentMetadata){
        const paramTypes: any[] =
            Reflect.getMetadata("design:paramtypes", target) || [];
        const componentScope: "singleton" | "transient" = meta.scope === "transient" ? "transient" : "singleton";

        if (process.env.NODE_ENV !== "test") {
            console.log(`Registering component: ${target.name} with dependencies:`, paramTypes.map(t => t?.name || 'unknown'));
        }
        
        const provider = () => {
            const startedAtNs = this.options.metricsEnabled ? process.hrtime.bigint() : 0n;
            if (this.resolving.has(target)) {
                const resolvingNames = Array.from(this.resolving).map(t => t.name || 'unknown').join(" -> ");
                throw new Error(`Circular dependency detected: ${resolvingNames} -> ${target.name}`);
            }
            
            this.resolving.add(target);

            
            try{
                const qualifiers = getConstructorQualifiers(target);
                const dependencies = paramTypes.map((dep, index) => {
                    const qualifier = qualifiers?.[index];
                    if (qualifier) {
                        // Named/qualified bindings are often compared by identity.
                        // Resolve them eagerly to preserve strict reference equality.
                        return this.getWithQualifier(dep, qualifier);
                    }
                    if (this.shouldUseLazyDependencies()) {
                        return this.createLazyDependency(() => this.getWithQualifier(dep, qualifier));
                    }
                    return this.getWithQualifier(dep, qualifier);
                });
                
                const instance = new target(...dependencies);
                
                this.injectAutoWiredFields(instance);

                //PostConstruct
                const postMethod = getPostConstructMethod(instance);
                if (postMethod && typeof instance[postMethod] === "function") {
                    instance[postMethod]();
                }

                //PreDestroy
                const preMethod = getPreDestroyMethod(instance);
                if (preMethod && typeof instance[preMethod] === "function") {
                    this.managedInstances.push({
                        instance,
                        preDestroy: () => instance[preMethod](),
                    });
                }
                this.recordInstantiationMetric(target, componentScope, startedAtNs);
            
            return instance;
        } finally {
            this.resolving.delete(target);
        }
    }
  
    if (meta.scope === "transient") {
            this.providers.set(target, provider);
        } else { //singleton by default
            this.providers.set(target,()=> {
                if (!this.singletons.has(target)) {
                    const instance = provider();
                    this.singletons.set(target, instance);
                }
              return this.singletons.get(target);
            })
        }
    }

    public getByName<T>(name: string): T {
        if (this.namedInstances.has(name)) {
            return this.namedInstances.get(name) as T;
        }

        const type = this.nameToType.get(name);
        if (!type) {
            throw new Error(`No component found with name: ${name}`);
        }
        return this.get(type);
    }

    public registerNamedInstance<T>(name: string, instance: T): void {
        if (!name) {
            throw new Error("Named instance requires a non-empty name");
        }
        this.namedInstances.set(name, instance);
    }

    public getRegisteredTypes(): any[] {
        return Array.from(this.providers.keys());
    }

    private getWithQualifier<T>(type: new (...args: any[]) => T, qualifier?: string): T {
        if(qualifier){
            return this.getByName<T>(qualifier);
        }
        return this.get(type);
    }

    private injectAutoWiredFields(instance: any) {
        const autoWiredProperties = getAutoWiredProperties(instance);
        autoWiredProperties.forEach((metaData, propertyKey) => {
            try {
                let value;
                if (metaData.qualifier) {
                    value = this.getByName(metaData.qualifier);
                } else {
                    value = this.get(metaData.type);
                }
                instance[propertyKey] = value;
            }catch (error) {
                if (metaData.required) {
                    throw new Error(`Failed to inject required dependency for property "${String(propertyKey)}": ${error.message}`);
                }
            }
        });
    }

    // Get instance of class
    get<T>(target: new (...args: any[]) => T): T {
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
        this.registeredConstructors.clear();
        this.instantiationMetrics.clear();
        this.typeToFile.clear();
        this.fileToTypes.clear();
    }
    
    // Scan folder recursively for .ts or .js files
    public async scanDir(dir: string): Promise<string[]> {
        let results: string[] = [];
        if (!existsSync(dir)) {
            return results;
        }
        for (const file of readdirSync(dir)) {
            const full = join (dir, file);
            const stat = statSync(full);
            if (stat && stat.isDirectory()) {
                if (this.ignoredDirs.has(file)) {
                    continue;
                }
                const res = await this.scanDir(full);
                results = results.concat(res);
            } else if (/\.(ts|js)$/.test(file)) {
                results.push(full);
            }
        }
        return results;
    }


    public registerLifeCycleListeners(app: any)
    { 
        
        for (const [type] of this.providers.entries()){
            // Check if class has lifecycle decorators
            const handlers = Reflect.getMetadata(HANDLERS_KEY, type) || [];
            const runners =  Reflect.getMetadata(RUNNERS_KEY, type) || [];
            const controller = Reflect.getMetadata(CONTROLLERS_KEY, type);
            const routes = Reflect.getMetadata(ROUTES_KEY, type) || [];

            if(handlers.length > 0 || runners.length > 0 || (controller && routes.length > 0)){
                const instance = this.get(type);
                registerEventHandlers(instance, app);
                registerControllerRoutes(instance, app);
            }
        }
    }
}