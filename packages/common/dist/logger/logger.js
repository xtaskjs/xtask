"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor() { }
    info(message) {
        console.log(`INFO: ${message}`);
    }
    warn(message) {
        console.warn(`WARN: ${message}`);
    }
    error(message) {
        console.error(`ERROR: ${message}`);
    }
}
exports.Logger = Logger;
