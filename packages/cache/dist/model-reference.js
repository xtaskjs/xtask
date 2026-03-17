"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDeclaredCacheModelName = void 0;
const resolveDeclaredCacheModelName = (value) => {
    if (typeof value === "string") {
        const normalizedValue = value.trim();
        if (!normalizedValue) {
            throw new Error("Cache model name requires a non-empty string");
        }
        return normalizedValue;
    }
    if (typeof value?.name === "string" && value.name.trim().length > 0) {
        return value.name.trim();
    }
    throw new Error("Cache model reference must be a non-empty string or a named class");
};
exports.resolveDeclaredCacheModelName = resolveDeclaredCacheModelName;
