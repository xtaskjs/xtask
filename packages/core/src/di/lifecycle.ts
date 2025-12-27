import "reflect-metadata";

export const  POST_CONSTRUCT_KEY = Symbol("post_construct");
export const PRE_DESTROY_KEY = Symbol("pre_destroy");

export function PostConstruct() {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(POST_CONSTRUCT_KEY, propertyKey, target);
  };
};


export function PreDestroy() {
    return function (target: any, propertyKey: string) {
        Reflect.defineMetadata(PRE_DESTROY_KEY, propertyKey, target);
    };  
}

export function getPostConstructMethod(target: any): string | undefined {
    return Reflect.getMetadata(POST_CONSTRUCT_KEY, target);
}

export function getPreDestroyMethod(target: any): string | undefined {
    return Reflect.getMetadata(PRE_DESTROY_KEY, target);
}   