"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectRepository = exports.InjectDataSource = void 0;
const core_1 = require("@xtaskjs/core");
const tokens_1 = require("./tokens");
const InjectDataSource = (name = "default") => {
    return (target, propertyKey, parameterIndex) => {
        const token = (0, tokens_1.getDataSourceToken)(name);
        if (typeof parameterIndex === "number") {
            (0, core_1.Qualifier)(token)(target, propertyKey, parameterIndex);
            return;
        }
        if (propertyKey !== undefined) {
            (0, core_1.AutoWired)({ qualifier: token })(target, propertyKey);
        }
    };
};
exports.InjectDataSource = InjectDataSource;
const InjectRepository = (entity, dataSourceName = "default") => {
    return (target, propertyKey, parameterIndex) => {
        const token = (0, tokens_1.getRepositoryToken)(entity, dataSourceName);
        if (typeof parameterIndex === "number") {
            (0, core_1.Qualifier)(token)(target, propertyKey, parameterIndex);
            return;
        }
        if (propertyKey !== undefined) {
            (0, core_1.AutoWired)({ qualifier: token })(target, propertyKey);
        }
    };
};
exports.InjectRepository = InjectRepository;
