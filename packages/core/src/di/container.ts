import "reflect-metadata"
import { ComponentMetadata, getComponentMetadata } from "./component";
import { getPostConstructMethod, getPreDestroyMethod } from "./lifecycle";  
import { existsSync, readdirSync , statSync } from "fs";
import { join } from "path";
import { ManagedInstance } from "./managedinstance";
import { getAutoWiredProperties } from "./autowired";
import { getConstructorQualifiers } from "./qualifier";
import { registerControllerRoutes, registerEventHandlers} from "../server";
import { CONTROLLERS_KEY, HANDLERS_KEY, ROUTES_KEY, RUNNERS_KEY } from "@xtaskjs/common";


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

    // SCAN FOLDER BASE DIR FOR @Service() AND @Component()

    async autoload(baseDir = "packages"){
        const scanRoot = join(process.cwd(), baseDir);
        const root = existsSync(baseDir) ? baseDir : scanRoot;
        const files = await this.scanDir(root);
        const seenConstructors = new Set<any>();
    
        for (const file of files) {
            const name = file.toString();
            if (name.endsWith(".d.ts")) continue;
            if (/(^|\/)index\.(ts|js)$/.test(name)) continue;
            if (/\.(test|spec)\.(ts|js)$/.test(name)) continue;

            const module = await import(file);
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

                if (seenConstructors.has(classConstructor)) {
                    continue;
                }

                seenConstructors.add(classConstructor);
                const metaData = getComponentMetadata(classConstructor) || { scope: "singleton" };
                const beanName = metaData.name || classConstructor.name;
                this.registerWithName(classConstructor, metaData, beanName);
            }
        } 
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