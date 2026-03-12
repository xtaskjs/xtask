import "reflect-metadata";
import { ComponentMetadata } from "./component";
import { ManagedInstance } from "./managedinstance";
export declare class Container {
    private providers;
    private singletons;
    private nameToType;
    private typeToNames;
    private primaryBeans;
    private namedInstances;
    private resolving;
    managedInstances: ManagedInstance[];
    private readonly ignoredDirs;
    autoload(baseDir?: string): Promise<void>;
    registerWithName(target: any, meta: ComponentMetadata, name?: string): void;
    register(target: any, meta: ComponentMetadata): void;
    getByName<T>(name: string): T;
    registerNamedInstance<T>(name: string, instance: T): void;
    private getWithQualifier;
    private injectAutoWiredFields;
    get<T>(target: new (...args: any[]) => T): T;
    destroy(): void;
    scanDir(dir: string): Promise<string[]>;
    registerLifeCycleListeners(app: any): void;
}
