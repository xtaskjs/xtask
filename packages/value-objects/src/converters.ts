import { JsonValue, ValueObjectLike } from "./types";

const JSON_LITERAL_PATTERN = /^(?:\{.*\}|\[.*\]|"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)$/s;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    if (value === null || typeof value !== "object") {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};

export const isValueObject = (value: unknown): value is ValueObjectLike<any, any> => {
    if (value === null || typeof value !== "object") {
        return false;
    }

    const candidate = value as Partial<ValueObjectLike<any, any>>;
    return typeof candidate.unwrap === "function" && typeof candidate.toJSON === "function";
};

export const unwrapValue = <T = unknown>(value: T | ValueObjectLike<T, any>): T => {
    if (isValueObject(value)) {
        return unwrapValue(value.unwrap() as T | ValueObjectLike<T, any>);
    }
    return value as T;
};

export const parseJsonValue = (value: string): JsonValue => {
    try {
        return JSON.parse(value) as JsonValue;
    } catch (error: any) {
        throw new Error(`Invalid JSON value: ${error?.message || "Unable to parse input"}`);
    }
};

export const looksLikeJsonString = (value: string): boolean => {
    const normalized = value.trim();
    return JSON_LITERAL_PATTERN.test(normalized);
};

export const toPlainValue = <T = unknown>(value: unknown): T => {
    const rawValue = unwrapValue(value);

    if (rawValue instanceof Date) {
        return new Date(rawValue.getTime()) as T;
    }

    if (Array.isArray(rawValue)) {
        return rawValue.map((entry) => toPlainValue(entry)) as T;
    }

    if (isPlainObject(rawValue)) {
        return Object.entries(rawValue).reduce((accumulator, [key, entry]) => {
            accumulator[key] = toPlainValue(entry);
            return accumulator;
        }, {} as Record<string, unknown>) as T;
    }

    return rawValue as T;
};

const toSerializableInternal = (value: unknown, insideArray = false): JsonValue | undefined => {
    const rawValue = unwrapValue(value);

    if (rawValue === undefined) {
        return insideArray ? null : undefined;
    }

    if (
        rawValue === null ||
        typeof rawValue === "string" ||
        typeof rawValue === "number" ||
        typeof rawValue === "boolean"
    ) {
        return rawValue as JsonValue;
    }

    if (typeof rawValue === "bigint") {
        return rawValue.toString();
    }

    if (rawValue instanceof Date) {
        return rawValue.toISOString();
    }

    if (Array.isArray(rawValue)) {
        return rawValue.map((entry) => {
            const serializedEntry = toSerializableInternal(entry, true);
            return serializedEntry === undefined ? null : serializedEntry;
        });
    }

    if (isPlainObject(rawValue)) {
        return Object.entries(rawValue).reduce((accumulator, [key, entry]) => {
            const serializedEntry = toSerializableInternal(entry, false);
            if (serializedEntry !== undefined) {
                accumulator[key] = serializedEntry;
            }
            return accumulator;
        }, {} as Record<string, JsonValue>);
    }

    return String(rawValue);
};

export const toSerializableValue = <TSerialized = JsonValue>(value: unknown): TSerialized => {
    const serializedValue = toSerializableInternal(value, false);
    return (serializedValue === undefined ? null : serializedValue) as TSerialized;
};

export const toJsonString = (value: unknown, spacing?: number): string => {
    return JSON.stringify(toSerializableValue(value), null, spacing);
};

export const toStringValue = (value: unknown): string => {
    const rawValue = unwrapValue(value);

    if (typeof rawValue === "string") {
        return rawValue;
    }

    if (rawValue instanceof Date) {
        return rawValue.toISOString();
    }

    if (typeof rawValue === "bigint") {
        return rawValue.toString();
    }

    if (typeof rawValue === "object" && rawValue !== null) {
        return toJsonString(rawValue);
    }

    return String(rawValue);
};

export const toNumberValue = (value: unknown): number => {
    const rawValue = unwrapValue(value);

    if (typeof rawValue === "number") {
        return rawValue;
    }

    if (typeof rawValue === "bigint") {
        return Number(rawValue);
    }

    if (typeof rawValue === "boolean") {
        return rawValue ? 1 : 0;
    }

    if (rawValue instanceof Date) {
        return rawValue.getTime();
    }

    if (typeof rawValue === "string") {
        const parsedValue = Number(rawValue.trim());
        if (Number.isNaN(parsedValue)) {
            throw new Error(`Cannot convert string '${rawValue}' to number`);
        }
        return parsedValue;
    }

    throw new Error(`Cannot convert value of type '${typeof rawValue}' to number`);
};

export const toBooleanValue = (value: unknown): boolean => {
    const rawValue = unwrapValue(value);

    if (typeof rawValue === "boolean") {
        return rawValue;
    }

    if (typeof rawValue === "number") {
        return rawValue !== 0;
    }

    if (typeof rawValue === "bigint") {
        return rawValue !== 0n;
    }

    if (rawValue instanceof Date) {
        return !Number.isNaN(rawValue.getTime());
    }

    if (typeof rawValue === "string") {
        const normalized = rawValue.trim().toLowerCase();
        if (["", "0", "false", "no", "off", "n"].includes(normalized)) {
            return false;
        }
        if (["1", "true", "yes", "on", "y"].includes(normalized)) {
            return true;
        }
        return normalized.length > 0;
    }

    return Boolean(rawValue);
};

export const toBigIntValue = (value: unknown): bigint => {
    const rawValue = unwrapValue(value);

    if (typeof rawValue === "bigint") {
        return rawValue;
    }

    if (typeof rawValue === "number") {
        if (!Number.isInteger(rawValue) || !Number.isFinite(rawValue)) {
            throw new Error(`Cannot convert non-integer number '${rawValue}' to bigint`);
        }
        return BigInt(rawValue);
    }

    if (typeof rawValue === "boolean") {
        return rawValue ? 1n : 0n;
    }

    if (rawValue instanceof Date) {
        return BigInt(rawValue.getTime());
    }

    if (typeof rawValue === "string") {
        try {
            return BigInt(rawValue.trim());
        } catch {
            throw new Error(`Cannot convert string '${rawValue}' to bigint`);
        }
    }

    throw new Error(`Cannot convert value of type '${typeof rawValue}' to bigint`);
};

export const toDateValue = (value: unknown): Date => {
    const rawValue = unwrapValue(value);

    if (rawValue instanceof Date) {
        return new Date(rawValue.getTime());
    }

    if (typeof rawValue === "number") {
        return new Date(rawValue);
    }

    if (typeof rawValue === "bigint") {
        return new Date(Number(rawValue));
    }

    if (typeof rawValue === "string") {
        const numericCandidate = Number(rawValue.trim());
        if (!Number.isNaN(numericCandidate) && rawValue.trim() !== "") {
            return new Date(numericCandidate);
        }

        const timestamp = Date.parse(rawValue);
        if (Number.isNaN(timestamp)) {
            throw new Error(`Cannot convert string '${rawValue}' to date`);
        }
        return new Date(timestamp);
    }

    throw new Error(`Cannot convert value of type '${typeof rawValue}' to date`);
};