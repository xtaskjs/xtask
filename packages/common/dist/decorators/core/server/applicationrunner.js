"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationRunner = ApplicationRunner;
const constants_1 = require("./constants");
function ApplicationRunner(priority = 0) {
    return (target, propertyKey) => {
        const runners = Reflect.getMetadata(constants_1.RUNNERS_KEY, target.constructor) || [];
        runners.push({ type: "ApplicationRunner", method: propertyKey, priority });
        Reflect.defineMetadata(constants_1.RUNNERS_KEY, runners, target.constructor);
    };
}
