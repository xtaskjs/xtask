import "reflect-metadata";
export type ComponentType = "service" | "controller" | "repository";
export type ScoreType = "singleton" | "transient";
export interface ComponentMetadata {
    scope?: "singleton" | "transient";
    condition?: () => boolean;
    name?: string;
    primary?: boolean;
}
export interface ComponentOptions {
    type?: ComponentType;
    scope?: ScoreType;
    condition?: () => boolean;
    name?: string;
    primary?: boolean;
}
export declare function Component(options?: ComponentOptions): (target: any) => void;
export declare function getComponentMetadata(target: any): ComponentOptions | undefined;
export declare const Service: (meta?: ComponentMetadata) => (target: any) => void;
export declare const Repository: (meta?: ComponentMetadata) => (target: any) => void;
