import "reflect-metadata";

export type ComponentType = "service" | "controller" | "repository";
export type ScoreType = "singleton" | "transient";

const COMPONENT_KEY = Symbol("xtaskjs:component");

export interface ComponentMetadata {
    scope ?: "singleton" | "transient";
    condition?:() => boolean;
    name?: string;
    primary?: boolean;
}

export interface ComponentOptions {
    type?: ComponentType;
    scope?: ScoreType;
    condition?:() => boolean;
    name?: string;
    primary?: boolean;
}

export function Component (options: ComponentOptions = {}) {
    return function (target: any) {
        Reflect.defineMetadata(COMPONENT_KEY, options, target);
    };
}

export function getComponentMetadata(target: any): ComponentOptions | undefined {
    return Reflect.getMetadata(COMPONENT_KEY, target);
}

export const Service  = (meta: ComponentMetadata = {}) => Component(meta);
export const Repository  = (meta: ComponentMetadata = {}) => Component(meta);