"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cqrs = exports.resetCqrsConfiguration = exports.getCqrsConfiguration = exports.configureCqrs = void 0;
const idempotency_1 = require("./idempotency");
const DEFAULT_READ_DATA_SOURCE_NAME = "read";
const DEFAULT_WRITE_DATA_SOURCE_NAME = "write";
let configuration = {
    readDataSourceName: DEFAULT_READ_DATA_SOURCE_NAME,
    writeDataSourceName: DEFAULT_WRITE_DATA_SOURCE_NAME,
    idempotencyStore: new idempotency_1.MemoryIdempotencyStore(),
};
const normalizeName = (value, fallback) => {
    if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
    }
    return fallback;
};
const configureCqrs = (options = {}) => {
    configuration = {
        readDataSourceName: normalizeName(options.readDataSourceName, configuration.readDataSourceName),
        writeDataSourceName: normalizeName(options.writeDataSourceName, configuration.writeDataSourceName),
        idempotencyStore: options.idempotencyStore || configuration.idempotencyStore,
    };
    return (0, exports.getCqrsConfiguration)();
};
exports.configureCqrs = configureCqrs;
const getCqrsConfiguration = () => ({
    ...configuration,
});
exports.getCqrsConfiguration = getCqrsConfiguration;
const resetCqrsConfiguration = () => {
    configuration = {
        readDataSourceName: DEFAULT_READ_DATA_SOURCE_NAME,
        writeDataSourceName: DEFAULT_WRITE_DATA_SOURCE_NAME,
        idempotencyStore: new idempotency_1.MemoryIdempotencyStore(),
    };
};
exports.resetCqrsConfiguration = resetCqrsConfiguration;
const Cqrs = (options = {}) => {
    return () => {
        (0, exports.configureCqrs)(options);
    };
};
exports.Cqrs = Cqrs;
