import {
    parseJsonValue,
    toBigIntValue,
    toBooleanValue,
    toDateValue,
    toNumberValue,
    toPlainValue,
    toSerializableValue,
    toStringValue,
} from "./converters";
import { JsonValue } from "./types";

const deepEqual = (left: unknown, right: unknown): boolean => {
    if (left === right) {
        return true;
    }

    if (left instanceof Date && right instanceof Date) {
        return left.getTime() === right.getTime();
    }

    if (Array.isArray(left) && Array.isArray(right)) {
        if (left.length !== right.length) {
            return false;
        }
        return left.every((entry, index) => deepEqual(entry, right[index]));
    }

    if (left && right && typeof left === "object" && typeof right === "object") {
        const leftEntries = Object.entries(left);
        const rightEntries = Object.entries(right);
        if (leftEntries.length !== rightEntries.length) {
            return false;
        }

        return leftEntries.every(([key, entry]) => deepEqual(entry, (right as Record<string, unknown>)[key]));
    }

    return false;
};

export abstract class ValueObject<TValue, TSerialized = TValue> {
    protected constructor(private readonly currentValue: TValue) {}

    get value(): TValue {
        return this.currentValue;
    }

    unwrap(): TValue {
        return toPlainValue<TValue>(this.currentValue);
    }

    toPlain(): TValue {
        return toPlainValue<TValue>(this.currentValue);
    }

    toJSON(): TSerialized {
        return toSerializableValue<TSerialized>(this.currentValue);
    }

    toString(): string {
        return toStringValue(this.currentValue);
    }

    toNumber(): number {
        return toNumberValue(this.currentValue);
    }

    toBoolean(): boolean {
        return toBooleanValue(this.currentValue);
    }

    toBigInt(): bigint {
        return toBigIntValue(this.currentValue);
    }

    toDate(): Date {
        return toDateValue(this.currentValue);
    }

    equals(other: unknown): boolean {
        return other instanceof (this.constructor as any)
            && deepEqual(this.toPlain(), (other as ValueObject<unknown>).toPlain());
    }

    valueOf(): TValue {
        return this.currentValue;
    }

    [Symbol.toPrimitive](hint: string): string | number {
        if (hint === "number") {
            return this.toNumber();
        }
        return this.toString();
    }
}

export abstract class StringValueObject extends ValueObject<string, string> {
    constructor(value: string) {
        super(value);
    }

    static from<TValueObject extends StringValueObject>(this: new (value: string) => TValueObject, value: unknown): TValueObject {
        return new this(toStringValue(value));
    }

    static fromPlain<TValueObject extends StringValueObject>(this: new (value: string) => TValueObject, value: unknown): TValueObject {
        return new this(toStringValue(value));
    }

    static fromJSON<TValueObject extends StringValueObject>(this: new (value: string) => TValueObject, value: string): TValueObject {
        return new this(toStringValue(parseJsonValue(value)));
    }

    static fromString<TValueObject extends StringValueObject>(this: new (value: string) => TValueObject, value: string): TValueObject {
        return new this(value);
    }

    static fromNumber<TValueObject extends StringValueObject>(this: new (value: string) => TValueObject, value: number): TValueObject {
        return new this(String(value));
    }

    static fromBoolean<TValueObject extends StringValueObject>(this: new (value: string) => TValueObject, value: boolean): TValueObject {
        return new this(String(value));
    }

    static fromBigInt<TValueObject extends StringValueObject>(this: new (value: string) => TValueObject, value: bigint): TValueObject {
        return new this(value.toString());
    }

    static fromDate<TValueObject extends StringValueObject>(this: new (value: string) => TValueObject, value: Date): TValueObject {
        return new this(value.toISOString());
    }
}

export abstract class NumberValueObject extends ValueObject<number, number> {
    constructor(value: number) {
        super(value);
    }

    static from<TValueObject extends NumberValueObject>(this: new (value: number) => TValueObject, value: unknown): TValueObject {
        return new this(toNumberValue(value));
    }

    static fromPlain<TValueObject extends NumberValueObject>(this: new (value: number) => TValueObject, value: unknown): TValueObject {
        return new this(toNumberValue(value));
    }

    static fromJSON<TValueObject extends NumberValueObject>(this: new (value: number) => TValueObject, value: string): TValueObject {
        return new this(toNumberValue(parseJsonValue(value)));
    }

    static fromString<TValueObject extends NumberValueObject>(this: new (value: number) => TValueObject, value: string): TValueObject {
        return new this(toNumberValue(value));
    }

    static fromNumber<TValueObject extends NumberValueObject>(this: new (value: number) => TValueObject, value: number): TValueObject {
        return new this(value);
    }

    static fromBoolean<TValueObject extends NumberValueObject>(this: new (value: number) => TValueObject, value: boolean): TValueObject {
        return new this(value ? 1 : 0);
    }

    static fromBigInt<TValueObject extends NumberValueObject>(this: new (value: number) => TValueObject, value: bigint): TValueObject {
        return new this(Number(value));
    }

    static fromDate<TValueObject extends NumberValueObject>(this: new (value: number) => TValueObject, value: Date): TValueObject {
        return new this(value.getTime());
    }
}

export abstract class BooleanValueObject extends ValueObject<boolean, boolean> {
    constructor(value: boolean) {
        super(value);
    }

    static from<TValueObject extends BooleanValueObject>(this: new (value: boolean) => TValueObject, value: unknown): TValueObject {
        return new this(toBooleanValue(value));
    }

    static fromPlain<TValueObject extends BooleanValueObject>(this: new (value: boolean) => TValueObject, value: unknown): TValueObject {
        return new this(toBooleanValue(value));
    }

    static fromJSON<TValueObject extends BooleanValueObject>(this: new (value: boolean) => TValueObject, value: string): TValueObject {
        return new this(toBooleanValue(parseJsonValue(value)));
    }

    static fromString<TValueObject extends BooleanValueObject>(this: new (value: boolean) => TValueObject, value: string): TValueObject {
        return new this(toBooleanValue(value));
    }

    static fromNumber<TValueObject extends BooleanValueObject>(this: new (value: boolean) => TValueObject, value: number): TValueObject {
        return new this(value !== 0);
    }

    static fromBoolean<TValueObject extends BooleanValueObject>(this: new (value: boolean) => TValueObject, value: boolean): TValueObject {
        return new this(value);
    }

    static fromBigInt<TValueObject extends BooleanValueObject>(this: new (value: boolean) => TValueObject, value: bigint): TValueObject {
        return new this(value !== 0n);
    }
}

export abstract class BigIntValueObject extends ValueObject<bigint, string> {
    constructor(value: bigint) {
        super(value);
    }

    static from<TValueObject extends BigIntValueObject>(this: new (value: bigint) => TValueObject, value: unknown): TValueObject {
        return new this(toBigIntValue(value));
    }

    static fromPlain<TValueObject extends BigIntValueObject>(this: new (value: bigint) => TValueObject, value: unknown): TValueObject {
        return new this(toBigIntValue(value));
    }

    static fromJSON<TValueObject extends BigIntValueObject>(this: new (value: bigint) => TValueObject, value: string): TValueObject {
        return new this(toBigIntValue(parseJsonValue(value)));
    }

    static fromString<TValueObject extends BigIntValueObject>(this: new (value: bigint) => TValueObject, value: string): TValueObject {
        return new this(toBigIntValue(value));
    }

    static fromNumber<TValueObject extends BigIntValueObject>(this: new (value: bigint) => TValueObject, value: number): TValueObject {
        return new this(toBigIntValue(value));
    }

    static fromBoolean<TValueObject extends BigIntValueObject>(this: new (value: bigint) => TValueObject, value: boolean): TValueObject {
        return new this(value ? 1n : 0n);
    }

    static fromBigInt<TValueObject extends BigIntValueObject>(this: new (value: bigint) => TValueObject, value: bigint): TValueObject {
        return new this(value);
    }

    static fromDate<TValueObject extends BigIntValueObject>(this: new (value: bigint) => TValueObject, value: Date): TValueObject {
        return new this(BigInt(value.getTime()));
    }

    toJSON(): string {
        return this.value.toString();
    }
}

export abstract class DateValueObject extends ValueObject<Date, string> {
    constructor(value: Date) {
        super(new Date(value.getTime()));
    }

    static from<TValueObject extends DateValueObject>(this: new (value: Date) => TValueObject, value: unknown): TValueObject {
        return new this(toDateValue(value));
    }

    static fromPlain<TValueObject extends DateValueObject>(this: new (value: Date) => TValueObject, value: unknown): TValueObject {
        return new this(toDateValue(value));
    }

    static fromJSON<TValueObject extends DateValueObject>(this: new (value: Date) => TValueObject, value: string): TValueObject {
        return new this(toDateValue(parseJsonValue(value)));
    }

    static fromString<TValueObject extends DateValueObject>(this: new (value: Date) => TValueObject, value: string): TValueObject {
        return new this(toDateValue(value));
    }

    static fromNumber<TValueObject extends DateValueObject>(this: new (value: Date) => TValueObject, value: number): TValueObject {
        return new this(new Date(value));
    }

    static fromBigInt<TValueObject extends DateValueObject>(this: new (value: Date) => TValueObject, value: bigint): TValueObject {
        return new this(new Date(Number(value)));
    }

    static fromDate<TValueObject extends DateValueObject>(this: new (value: Date) => TValueObject, value: Date): TValueObject {
        return new this(value);
    }

    toJSON(): string {
        return this.value.toISOString();
    }
}

export abstract class JsonValueObject<TValue extends JsonValue> extends ValueObject<TValue, TValue> {
    constructor(value: TValue) {
        super(value);
    }

    static from<TValue extends JsonValue, TValueObject extends JsonValueObject<TValue>>(this: new (value: TValue) => TValueObject, value: unknown): TValueObject {
        return new this(toSerializableValue<TValue>(value));
    }

    static fromPlain<TValue extends JsonValue, TValueObject extends JsonValueObject<TValue>>(this: new (value: TValue) => TValueObject, value: unknown): TValueObject {
        return new this(toSerializableValue<TValue>(value));
    }

    static fromJSON<TValue extends JsonValue, TValueObject extends JsonValueObject<TValue>>(this: new (value: TValue) => TValueObject, value: string): TValueObject {
        return new this(parseJsonValue(value) as TValue);
    }

    static fromString<TValue extends JsonValue, TValueObject extends JsonValueObject<TValue>>(this: new (value: TValue) => TValueObject, value: string): TValueObject {
        return new this(value as TValue);
    }

    toJSON(): TValue {
        return toSerializableValue<TValue>(this.value);
    }
}