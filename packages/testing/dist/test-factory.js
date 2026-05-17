"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Test = void 0;
const testing_module_builder_1 = require("./testing-module.builder");
class Test {
    static createTestingModule(moduleOrMetadata) {
        return new testing_module_builder_1.TestingModuleBuilder(moduleOrMetadata);
    }
}
exports.Test = Test;
