import "reflect-metadata";
export declare const POST_CONSTRUCT_KEY: unique symbol;
export declare const PRE_DESTROY_KEY: unique symbol;
export declare function PostConstruct(): (target: any, propertyKey: string) => void;
export declare function PreDestroy(): (target: any, propertyKey: string) => void;
export declare function getPostConstructMethod(target: any): string | undefined;
export declare function getPreDestroyMethod(target: any): string | undefined;
