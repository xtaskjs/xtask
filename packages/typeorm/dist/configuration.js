"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeOrmDataSource = exports.clearRegisteredTypeOrmDataSources = exports.getRegisteredTypeOrmDataSources = exports.registerTypeOrmDataSource = void 0;
const DEFAULT_DATA_SOURCE_NAME = "default";
const registeredDataSources = new Map();
const resolveDataSourceName = (options) => {
    if (typeof options.name === "string" && options.name.trim().length > 0) {
        return options.name;
    }
    return DEFAULT_DATA_SOURCE_NAME;
};
const registerTypeOrmDataSource = (options) => {
    const name = resolveDataSourceName(options);
    registeredDataSources.set(name, { ...options, name });
};
exports.registerTypeOrmDataSource = registerTypeOrmDataSource;
const getRegisteredTypeOrmDataSources = () => {
    return Array.from(registeredDataSources.values());
};
exports.getRegisteredTypeOrmDataSources = getRegisteredTypeOrmDataSources;
const clearRegisteredTypeOrmDataSources = () => {
    registeredDataSources.clear();
};
exports.clearRegisteredTypeOrmDataSources = clearRegisteredTypeOrmDataSources;
const TypeOrmDataSource = (options) => {
    return () => {
        (0, exports.registerTypeOrmDataSource)(options);
    };
};
exports.TypeOrmDataSource = TypeOrmDataSource;
