"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Qualifier = Qualifier;
exports.getQualifier = getQualifier;
exports.getConstructorQualifiers = getConstructorQualifiers;
require("reflect-metadata");
const QUALIFIER_KEY = Symbol("xtaskjs:qualifier");
function Qualifier(name) {
    return function (target, propertyKey, parameterIndex) {
        if (parameterIndex !== undefined) {
            // Parameter decorator
            const existingQualifiers = Reflect.getMetadata(QUALIFIER_KEY, target) || {};
            existingQualifiers[parameterIndex] = name;
            Reflect.defineMetadata(QUALIFIER_KEY, existingQualifiers, target);
        }
    };
}
function getQualifier(target, propertyKey) {
    if (propertyKey) {
        return Reflect.getMetadata(QUALIFIER_KEY, target, propertyKey);
    }
    return undefined;
}
function getConstructorQualifiers(target) {
    return Reflect.getMetadata(QUALIFIER_KEY, target);
}
