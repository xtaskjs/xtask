"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRE_DESTROY_KEY = exports.POST_CONSTRUCT_KEY = void 0;
exports.PostConstruct = PostConstruct;
exports.PreDestroy = PreDestroy;
exports.getPostConstructMethod = getPostConstructMethod;
exports.getPreDestroyMethod = getPreDestroyMethod;
require("reflect-metadata");
exports.POST_CONSTRUCT_KEY = Symbol("post_construct");
exports.PRE_DESTROY_KEY = Symbol("pre_destroy");
function PostConstruct() {
    return function (target, propertyKey) {
        Reflect.defineMetadata(exports.POST_CONSTRUCT_KEY, propertyKey, target);
    };
}
;
function PreDestroy() {
    return function (target, propertyKey) {
        Reflect.defineMetadata(exports.PRE_DESTROY_KEY, propertyKey, target);
    };
}
function getPostConstructMethod(target) {
    return Reflect.getMetadata(exports.POST_CONSTRUCT_KEY, target);
}
function getPreDestroyMethod(target) {
    return Reflect.getMetadata(exports.PRE_DESTROY_KEY, target);
}
