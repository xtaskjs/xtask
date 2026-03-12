import { ComponentOptions } from "./component";
export declare const Service: (options?: Omit<ComponentOptions, "type">) => (target: any) => void;
export declare const Controller: (options?: Omit<ComponentOptions, "type">) => (target: any) => void;
export declare const Repository: (options?: Omit<ComponentOptions, "type">) => (target: any) => void;
