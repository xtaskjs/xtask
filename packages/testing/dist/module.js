"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Module = Module;
exports.getModuleMetadata = getModuleMetadata;
require("reflect-metadata");
const TESTING_MODULE_METADATA_KEY = Symbol("xtaskjs:testing:module");
function Module(metadata) {
    return (target) => {
        Reflect.defineMetadata(TESTING_MODULE_METADATA_KEY, metadata, target);
    };
}
function getModuleMetadata(target) {
    return Reflect.getMetadata(TESTING_MODULE_METADATA_KEY, target);
}
