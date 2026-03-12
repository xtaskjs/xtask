"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnEvent = OnEvent;
const constants_1 = require("./constants");
function OnEvent(phase, priority = 0) {
    return (target, propertyKey) => {
        const handlers = Reflect.getMetadata(constants_1.HANDLERS_KEY, target.constructor) || [];
        handlers.push({ phase, method: propertyKey, priority });
        Reflect.defineMetadata(constants_1.HANDLERS_KEY, handlers, target.constructor);
    };
}
