"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestingModule = void 0;
class TestingModule {
    constructor(injector) {
        this.injector = injector;
    }
    get(token) {
        return this.injector.get(token);
    }
    resolve(token) {
        return Promise.resolve(this.get(token));
    }
    has(token) {
        return this.injector.has(token);
    }
    close() {
        this.injector.destroy();
        return Promise.resolve();
    }
}
exports.TestingModule = TestingModule;
