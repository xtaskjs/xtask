"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Autowired = void 0;
exports.AutoWired = AutoWired;
exports.getAutoWiredProperties = getAutoWiredProperties;
require("reflect-metadata");
const AUTOWIRED_KEY = Symbol("xtaskjs:autowired");
const AUTOWIRED_PROPS_KEY = Symbol("xtaskjs:autowired:props");
function AutoWired(options = {}) {
    return function (target, propertyKey) {
        const type = Reflect.getMetadata("design:type", target, propertyKey);
        const metaData = {
            type,
            required: options.required !== false,
            qualifier: options.qualifier,
        };
        // Store metadata for the property
        Reflect.defineMetadata(AUTOWIRED_KEY, metaData, target, propertyKey);
        // Store list of autowired properties on the class prototype
        const existingProps = Reflect.getMetadata(AUTOWIRED_PROPS_KEY, target.constructor) || [];
        if (!existingProps.includes(propertyKey)) {
            existingProps.push(propertyKey);
            Reflect.defineMetadata(AUTOWIRED_PROPS_KEY, existingProps, target.constructor);
        }
    };
}
function getAutoWiredProperties(target) {
    const properties = new Map();
    let currentPrototype = Object.getPrototypeOf(target);
    while (currentPrototype && currentPrototype !== Object.prototype) {
        const autowiredProps = Reflect.getMetadata(AUTOWIRED_PROPS_KEY, currentPrototype.constructor) || [];
        autowiredProps.forEach((prop) => {
            const metaData = Reflect.getMetadata(AUTOWIRED_KEY, currentPrototype, prop);
            if (metaData && !properties.has(prop)) {
                properties.set(prop, metaData);
            }
        });
        currentPrototype = Object.getPrototypeOf(currentPrototype);
    }
    return properties;
}
exports.Autowired = AutoWired;
