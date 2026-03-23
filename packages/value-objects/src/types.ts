export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface ValueObjectLike<TValue = unknown, TSerialized = unknown> {
    readonly value: TValue;
    unwrap(): TValue;
    toPlain(): TValue;
    toJSON(): TSerialized;
    equals(other: unknown): boolean;
}

export type ValueObjectConstructor<TValueObject = any> = new (...args: any[]) => TValueObject;

export type ValueObjectStaticFactory<TValueObject = any> = ValueObjectConstructor<TValueObject> & {
    from?(value: unknown): TValueObject;
    fromPlain?(value: unknown): TValueObject;
    fromJSON?(value: string): TValueObject;
    fromString?(value: string): TValueObject;
    fromNumber?(value: number): TValueObject;
    fromBoolean?(value: boolean): TValueObject;
    fromBigInt?(value: bigint): TValueObject;
    fromDate?(value: Date): TValueObject;
};

export interface ValueObjectFactory<TValueObject> {
    readonly type: ValueObjectStaticFactory<TValueObject>;
    create(value: unknown): TValueObject;
    from(value: unknown): TValueObject;
    fromPlain(value: unknown): TValueObject;
    fromJSON(value: string): TValueObject;
    fromString(value: string): TValueObject;
    fromNumber(value: number): TValueObject;
    fromBoolean(value: boolean): TValueObject;
    fromBigInt(value: bigint): TValueObject;
    fromDate(value: Date): TValueObject;
}

export interface TransformValueObjectOptions<TValueObject> {
    source?: "plain" | "json" | "auto";
    fromPlain?: (value: unknown) => TValueObject;
    toPlain?: (value: TValueObject) => unknown;
}

export interface ValueObjectFactoryProviderOptions {
    name?: string;
    scope?: "singleton" | "transient";
}