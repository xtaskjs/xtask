import { DataSourceOptions } from "typeorm";
export type XTaskTypeOrmDataSourceOptions = DataSourceOptions & {
    name?: string;
    initializeOnServerStart?: boolean;
};
export declare const registerTypeOrmDataSource: (options: XTaskTypeOrmDataSourceOptions) => void;
export declare const getRegisteredTypeOrmDataSources: () => XTaskTypeOrmDataSourceOptions[];
export declare const clearRegisteredTypeOrmDataSources: () => void;
export declare const TypeOrmDataSource: (options: XTaskTypeOrmDataSourceOptions) => ClassDecorator;
