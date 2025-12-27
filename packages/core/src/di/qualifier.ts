import "reflect-metadata";

const QUALIFIER_KEY = Symbol("xtaskjs:qualifier");

export function Qualifier(name: string) {
    return function (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) {
        if(parameterIndex !== undefined){
            // Parameter decorator
            const existingQualifiers = Reflect.getMetadata(QUALIFIER_KEY, target) || {};
            existingQualifiers[parameterIndex] = name;
            Reflect.defineMetadata(QUALIFIER_KEY, existingQualifiers, target);
        }
    };
}

export function getQualifier(target: any, propertyKey?: string | symbol): string | undefined {
    if(propertyKey){
        return Reflect.getMetadata(QUALIFIER_KEY, target, propertyKey);
    }
    return undefined;
}

export function getConstructorQualifiers(target: any):Record<number,string>| undefined {
    return Reflect.getMetadata(QUALIFIER_KEY, target);
}