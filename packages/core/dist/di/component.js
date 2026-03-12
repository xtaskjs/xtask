"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Repository = exports.Service = void 0;
exports.Component = Component;
exports.getComponentMetadata = getComponentMetadata;
require("reflect-metadata");
const COMPONENT_KEY = Symbol("xtaskjs:component");
function Component(options = {}) {
    return function (target) {
        Reflect.defineMetadata(COMPONENT_KEY, options, target);
    };
}
function getComponentMetadata(target) {
    return Reflect.getMetadata(COMPONENT_KEY, target);
}
const Service = (meta = {}) => Component(meta);
exports.Service = Service;
const Repository = (meta = {}) => Component(meta);
exports.Repository = Repository;
