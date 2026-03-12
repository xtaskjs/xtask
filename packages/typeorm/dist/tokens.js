"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepositoryToken = exports.getDataSourceToken = void 0;
const DATA_SOURCE_TOKEN_PREFIX = "xtask:typeorm:datasource";
const REPOSITORY_TOKEN_PREFIX = "xtask:typeorm:repository";
const resolveEntityTokenName = (entity) => {
    if (typeof entity === "string") {
        return entity;
    }
    if (typeof entity.name === "string" && entity.name.trim().length > 0) {
        return entity.name;
    }
    return "anonymous";
};
const getDataSourceToken = (name = "default") => {
    return `${DATA_SOURCE_TOKEN_PREFIX}:${name}`;
};
exports.getDataSourceToken = getDataSourceToken;
const getRepositoryToken = (entity, dataSourceName = "default") => {
    return `${REPOSITORY_TOKEN_PREFIX}:${dataSourceName}:${resolveEntityTokenName(entity)}`;
};
exports.getRepositoryToken = getRepositoryToken;
