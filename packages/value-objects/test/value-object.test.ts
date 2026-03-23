import "reflect-metadata";

import { instanceToPlain, plainToInstance } from "class-transformer";

import { getComponentMetadata } from "@xtaskjs/core";
import { Container } from "@xtaskjs/core";

import {
    BigIntValueObject,
    DateValueObject,
    InjectableValueObjectFactory,
    JsonValueObject,
    NumberValueObject,
    StringValueObject,
    TransformValueObject,
    ValueObjectFactoryFor,
    createValueObjectFactory,
    toJsonString,
} from "../src";

class EmailAddress extends StringValueObject {
    constructor(value: string) {
        super(value.trim().toLowerCase());
    }
}

class Quantity extends NumberValueObject {}

class OrderId extends BigIntValueObject {}

class IssuedAt extends DateValueObject {}

class Preferences extends JsonValueObject<{ theme: string; locale: string }> {}

class CreateUserDto {
    @TransformValueObject(EmailAddress)
    email!: EmailAddress;

    @TransformValueObject(Preferences, { source: "json" })
    preferences!: Preferences;
}

@ValueObjectFactoryFor(EmailAddress)
class EmailAddressFactory extends InjectableValueObjectFactory<EmailAddress> {}

describe("value objects", () => {
    it("should convert primitive-backed value objects across raw formats", () => {
        const email = EmailAddress.fromJSON('"USER@Example.com"');
        const quantity = Quantity.fromString("42");
        const orderId = OrderId.fromNumber(9001);

        expect(email.value).toBe("user@example.com");
        expect(email.toString()).toBe("user@example.com");
        expect(quantity.toNumber()).toBe(42);
        expect(orderId.toBigInt()).toBe(9001n);
        expect(orderId.toJSON()).toBe("9001");
    });

    it("should serialize JSON-backed value objects predictably", () => {
        const preferences = Preferences.fromJSON('{"theme":"sand","locale":"en"}');

        expect(preferences.toPlain()).toEqual({ theme: "sand", locale: "en" });
        expect(preferences.toJSON()).toEqual({ theme: "sand", locale: "en" });
        expect(toJsonString(preferences)).toBe('{"theme":"sand","locale":"en"}');
    });

    it("should convert dates consistently", () => {
        const issuedAt = IssuedAt.fromString("2026-03-22T10:00:00.000Z");

        expect(issuedAt.toJSON()).toBe("2026-03-22T10:00:00.000Z");
        expect(issuedAt.toDate()).toEqual(new Date("2026-03-22T10:00:00.000Z"));
    });

    it("should integrate with class-transformer decorators", () => {
        const dto = plainToInstance(CreateUserDto, {
            email: "USER@Example.com",
            preferences: '{"theme":"ember","locale":"es"}',
        });

        expect(dto.email).toBeInstanceOf(EmailAddress);
        expect(dto.email.value).toBe("user@example.com");
        expect(dto.preferences).toBeInstanceOf(Preferences);
        expect(dto.preferences.toPlain()).toEqual({ theme: "ember", locale: "es" });
        expect(instanceToPlain(dto)).toEqual({
            email: "user@example.com",
            preferences: { theme: "ember", locale: "es" },
        });
    });

    it("should expose factories that can be registered in the xtaskjs container", () => {
        const container = new Container();
        const componentMetadata = getComponentMetadata(EmailAddressFactory) || { scope: "singleton" };

        container.registerWithName(
            EmailAddressFactory,
            componentMetadata,
            componentMetadata.name || EmailAddressFactory.name
        );

        const factory = container.get(EmailAddressFactory);
        const created = factory.fromString("USER@Example.com");
        const adHocFactory = createValueObjectFactory(EmailAddress);

        expect(created.value).toBe("user@example.com");
        expect(adHocFactory.fromNumber(123).value).toBe("123");
    });
});