"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandLineRunner = CommandLineRunner;
const constants_1 = require("./constants");
function CommandLineRunner(priority = 0) {
    return (target, propertyKey) => {
        const runners = Reflect.getMetadata(constants_1.RUNNERS_KEY, target.constructor) || [];
        runners.push({ type: "CommandLineRunner", method: propertyKey, priority });
        Reflect.defineMetadata(constants_1.RUNNERS_KEY, runners, target.constructor);
    };
}
