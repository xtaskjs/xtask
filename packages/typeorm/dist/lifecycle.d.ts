import { Container } from "@xtaskjs/core";
import { DataSource, ObjectLiteral, ObjectType, Repository } from "typeorm";
export declare class TypeOrmLifecycleManager {
    private readonly dataSources;
    initialize(container?: Container): Promise<void>;
    destroy(): Promise<void>;
    getDataSource(name?: string): DataSource;
    getRepository<T extends ObjectLiteral>(entity: ObjectType<T>, dataSourceName?: string): Repository<T>;
    isInitialized(name?: string): boolean;
    private registerNamedInstances;
}
export declare const initializeTypeOrmIntegration: (container?: Container) => Promise<void>;
export declare const shutdownTypeOrmIntegration: () => Promise<void>;
export declare const getTypeOrmLifecycleManager: () => TypeOrmLifecycleManager;
