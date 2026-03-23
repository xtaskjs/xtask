import { toSerializableValue } from "./converters";
import { fromAutoValue, fromJsonValue, fromPlainValue } from "./factories";
import { TransformValueObjectOptions, ValueObjectStaticFactory } from "./types";

const loadClassTransformer = (): typeof import("class-transformer") => {
    try {
        return require("class-transformer") as typeof import("class-transformer");
    } catch {
        throw new Error(
            "TransformValueObject requires class-transformer. Install it with: npm install class-transformer"
        );
    }
};

export function TransformValueObject<TValueObject>(
    type: ValueObjectStaticFactory<TValueObject>,
    options: TransformValueObjectOptions<TValueObject> = {}
): PropertyDecorator {
    const { Transform, TransformationType } = loadClassTransformer();

    return Transform(({ value, type: transformType }) => {
        if (value === null || value === undefined) {
            return value;
        }

        if (transformType === TransformationType.CLASS_TO_PLAIN) {
            return options.toPlain ? options.toPlain(value) : toSerializableValue(value);
        }

        if (transformType === TransformationType.CLASS_TO_CLASS) {
            return value;
        }

        if (options.fromPlain) {
            return options.fromPlain(value);
        }

        if (options.source === "json") {
            return typeof value === "string" ? fromJsonValue(type, value) : fromPlainValue(type, value);
        }

        if (options.source === "plain") {
            return fromPlainValue(type, value);
        }

        return fromAutoValue(type, value);
    });
}