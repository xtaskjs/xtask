"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEventHandlers = registerEventHandlers;
require("reflect-metadata");
const common_1 = require("@xtaskjs/common");
function registerEventHandlers(instance, app) {
    const handlers = Reflect.getMetadata(common_1.HANDLERS_KEY, instance.constructor) || [];
    for (const { phase, method, priority } of handlers.sort((a, b) => b.priority - a.priority)) {
        app.on(phase, async (...args) => instance[method](...args), priority);
    }
    const runners = Reflect.getMetadata(common_1.RUNNERS_KEY, instance.constructor) || [];
    for (const { type, method, priority } of runners.sort((a, b) => b.priority - a.priority)) {
        app.registerRunner((args) => instance[method](...args), type, priority);
    }
}
