import "reflect-metadata";

import { looksLikeJsonString, parseJsonValue, toPlainValue } from "./converters";
import {
    ValueObjectFactory,
    ValueObjectFactoryProviderOptions,
    ValueObjectStaticFactory,
} from "./types";

const FACTORY_TARGET_KEY = Symbol("xtaskjs:value-object-factory:target");

const loadCoreModule = (): typeof import("@xtaskjs/core") => {
    try {
        return require("@xtaskjs/core") as typeof import("@xtaskjs/core");
    } catch {
        throw new Error(
            "Value object factory decorators require @xtaskjs/core. Install it with: npm install @xtaskjs/core"
        );
    }
};

const instantiateValueObject = <TValueObject>(
    type: ValueObjectStaticFactory<TValueObject>,
    method: keyof ValueObjectStaticFactory<TValueObject>,
    value: unknown,
    fallback: () => TValueObject
): TValueObject => {
    const candidate = type[method];
    if (typeof candidate === "function") {
        return candidate.call(type, value);
    }

    return fallback();
};

const fromValue = <TValueObject>(type: ValueObjectStaticFactory<TValueObject>, value: unknown): TValueObject => {
    if (value instanceof type) {
        return value as TValueObject;
    }

    return instantiateValueObject(type, "from", value, () => new type(value));
};

export const fromPlainValue = <TValueObject>(type: ValueObjectStaticFactory<TValueObject>, value: unknown): TValueObject => {
    return instantiateValueObject(type, "fromPlain", value, () => fromValue(type, toPlainValue(value)));
};

export const fromJsonValue = <TValueObject>(type: ValueObjectStaticFactory<TValueObject>, value: string): TValueObject => {
    return instantiateValueObject(type, "fromJSON", value, () => fromValue(type, parseJsonValue(value)));
};

export const fromStringValue = <TValueObject>(type: ValueObjectStaticFactory<TValueObject>, value: string): TValueObject => {
    return instantiateValueObject(type, "fromString", value, () => fromValue(type, value));
};

export const fromNumberValue = <TValueObject>(type: ValueObjectStaticFactory<TValueObject>, value: number): TValueObject => {
    return instantiateValueObject(type, "fromNumber", value, () => fromValue(type, value));
};

export const fromBooleanValue = <TValueObject>(type: ValueObjectStaticFactory<TValueObject>, value: boolean): TValueObject => {
    return instantiateValueObject(type, "fromBoolean", value, () => fromValue(type, value));
};

export const fromBigIntValue = <TValueObject>(type: ValueObjectStaticFactory<TValueObject>, value: bigint): TValueObject => {
    return instantiateValueObject(type, "fromBigInt", value, () => fromValue(type, value));
};

export const fromDateValue = <TValueObject>(type: ValueObjectStaticFactory<TValueObject>, value: Date): TValueObject => {
    return instantiateValueObject(type, "fromDate", value, () => fromValue(type, value));
};

export const fromAutoValue = <TValueObject>(type: ValueObjectStaticFactory<TValueObject>, value: unknown): TValueObject => {
    if (typeof value === "string" && looksLikeJsonString(value)) {
        try {
            return fromJsonValue(type, value);
        } catch {
            return fromValue(type, value);
        }
    }

    return fromValue(type, value);
};

export const createValueObjectFactory = <TValueObject>(
    type: ValueObjectStaticFactory<TValueObject>
): ValueObjectFactory<TValueObject> => ({
    type,
    create: (value) => fromValue(type, value),
    from: (value) => fromValue(type, value),
    fromPlain: (value) => fromPlainValue(type, value),
    fromJSON: (value) => fromJsonValue(type, value),
    fromString: (value) => fromStringValue(type, value),
    fromNumber: (value) => fromNumberValue(type, value),
    fromBoolean: (value) => fromBooleanValue(type, value),
    fromBigInt: (value) => fromBigIntValue(type, value),
    fromDate: (value) => fromDateValue(type, value),
});

const resolveFactoryType = <TValueObject>(target: any): ValueObjectStaticFactory<TValueObject> => {
    const valueObjectType = Reflect.getMetadata(FACTORY_TARGET_KEY, target) as
        | ValueObjectStaticFactory<TValueObject>
        | undefined;

    if (!valueObjectType) {
        throw new Error(
            `No value object type metadata found for ${target?.name || "factory"}. Use @ValueObjectFactoryFor(...) or pass a type to the constructor.`
        );
    }

    return valueObjectType;
};

export class InjectableValueObjectFactory<TValueObject> implements ValueObjectFactory<TValueObject> {
    readonly type: ValueObjectStaticFactory<TValueObject>;

    constructor(type?: ValueObjectStaticFactory<TValueObject>) {
        this.type = type || resolveFactoryType<TValueObject>(this.constructor);
    }

    create(value: unknown): TValueObject {
        return fromValue(this.type, value);
    }

    from(value: unknown): TValueObject {
        return this.create(value);
    }

    fromPlain(value: unknown): TValueObject {
        return fromPlainValue(this.type, value);
    }

    fromJSON(value: string): TValueObject {
        return fromJsonValue(this.type, value);
    }

    fromString(value: string): TValueObject {
        return fromStringValue(this.type, value);
    }

    fromNumber(value: number): TValueObject {
        return fromNumberValue(this.type, value);
    }

    fromBoolean(value: boolean): TValueObject {
        return fromBooleanValue(this.type, value);
    }

    fromBigInt(value: bigint): TValueObject {
        return fromBigIntValue(this.type, value);
    }

    fromDate(value: Date): TValueObject {
        return fromDateValue(this.type, value);
    }
}

export function ValueObjectFactoryFor<TValueObject>(
    type: ValueObjectStaticFactory<TValueObject>,
    options: ValueObjectFactoryProviderOptions = {}
): ClassDecorator {
    return (target: any) => {
        Reflect.defineMetadata(FACTORY_TARGET_KEY, type, target);

        const { Service } = loadCoreModule();
        Service({
            scope: options.scope || "singleton",
            name: options.name,
        })(target);
    };
}