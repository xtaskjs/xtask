import "reflect-metadata"
import { ComponentMetadata, getComponentMetadata } from "./component";
import { getPostConstructMethod, getPreDestroyMethod } from "./lifecycle";  
import { existsSync, readdirSync , statSync } from "fs";
import { join } from "path";
import { availableParallelism } from "os";
import { Worker } from "worker_threads";
import { ManagedInstance } from "./managedinstance";
import { getAutoWiredProperties } from "./autowired";
import { getConstructorQualifiers } from "./qualifier";
import { registerControllerRoutes, registerEventHandlers} from "../server";
import { CONTROLLERS_KEY, HANDLERS_KEY, Logger, ROUTES_KEY, RUNNERS_KEY } from "@xtaskjs/common";


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
    private readonly registeredConstructors = new Set<any>();
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

    constructor() {
        this.registerWithName(Logger, { scope: "singleton" }, Logger.name);
    }

    // SCAN FOLDER BASE DIR FOR @Service() AND @Component()

    async autoload(baseDir = "packages"){
        const scanRoot = join(process.cwd(), baseDir);
        const root = existsSync(baseDir) ? baseDir : scanRoot;
        const files = await this.scanDir(root);
        await this.autoloadFiles(files);
    }

    async autoloadFiles(files: string[]) {
        const candidates = files.filter((file) => this.isAutoloadCandidate(file));
        const discoverableFiles = await this.discoverAutoloadCandidates(candidates);
        const loadedModules = await Promise.all(
            discoverableFiles.map(async (file) => ({ file, module: await import(file) }))
        );

        for (const { module } of loadedModules) {
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

        if (process.env.NODE_ENV !== "test") {
            console.log(`Registering component: ${target.name} with dependencies:`, paramTypes.map(t => t?.name || 'unknown'));
        }
        
        const provider = () => {
            if (this.resolving.has(target)) {
                const resolvingNames = Array.from(this.resolving).map(t => t.name || 'unknown').join(" -> ");
                throw new Error(`Circular dependency detected: ${resolvingNames} -> ${target.name}`);
            }
            
            this.resolving.add(target);

            
            try{
                const qualifiers = getConstructorQualifiers(target);
                const dependencies = paramTypes.map((dep, index) => {
                    const qualifier = qualifiers?.[index];
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