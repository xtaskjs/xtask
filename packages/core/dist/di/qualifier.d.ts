import "reflect-metadata";
export declare function Qualifier(name: string): (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => void;
export declare function getQualifier(target: any, propertyKey?: string | symbol): string | undefined;
export declare function getConstructorQualifiers(target: any): Record<number, string> | undefined;
