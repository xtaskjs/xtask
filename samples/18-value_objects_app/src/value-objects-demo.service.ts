import { Logger } from "@xtaskjs/common";
import { Service } from "@xtaskjs/core";
import {
  BigIntValueObject,
  DateValueObject,
  InjectableValueObjectFactory,
  JsonValueObject,
  NumberValueObject,
  StringValueObject,
  ValueObjectFactoryFor,
  createValueObjectFactory,
} from "@xtaskjs/value-objects";

type CustomerPreferencesValue = {
  locale: string;
  marketing: boolean;
};

export class EmailAddress extends StringValueObject {
  private readonly normalizedValue: string;

  constructor(value: string) {
    const normalized = value.trim().toLowerCase();

    if (!normalized.includes("@")) {
      throw new Error("EmailAddress requires a valid email address");
    }

    super(normalized);
    this.normalizedValue = normalized;
  }

  static fromString(value: string) {
    return new EmailAddress(value);
  }

  toString() {
    return this.normalizedValue;
  }

  toJSON() {
    return this.normalizedValue;
  }

  equals(other: EmailAddress) {
    return this.toString() === other.toString();
  }
}

export class DisplayName extends StringValueObject {
  private readonly normalizedValue: string;

  constructor(value: string) {
    const normalized = value.trim().replace(/\s+/g, " ");

    if (normalized.length < 2) {
      throw new Error("DisplayName must contain at least 2 characters");
    }

    super(normalized);
    this.normalizedValue = normalized;
  }

  toString() {
    return this.normalizedValue;
  }

  toJSON() {
    return this.normalizedValue;
  }
}

export class BudgetAmount extends NumberValueObject {
  private readonly amount: number;

  constructor(value: number) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("BudgetAmount must be a finite positive number");
    }

    const normalized = Number(value.toFixed(2));

    super(normalized);
    this.amount = normalized;
  }

  static fromString(value: string) {
    return new BudgetAmount(Number(value));
  }

  toNumber() {
    return this.amount;
  }

  toJSON() {
    return this.amount;
  }
}

export class CustomerPreferences extends JsonValueObject<CustomerPreferencesValue> {
  private readonly normalizedValue: CustomerPreferencesValue;

  constructor(value: CustomerPreferencesValue) {
    const locale = typeof value?.locale === "string" ? value.locale.trim().toLowerCase() : "";

    if (!locale) {
      throw new Error("CustomerPreferences.locale is required");
    }

    const normalized = {
      locale,
      marketing: Boolean(value?.marketing),
    };

    super(normalized);
    this.normalizedValue = normalized;
  }

  static fromJSON(value: string) {
    return new CustomerPreferences(JSON.parse(value) as CustomerPreferencesValue);
  }

  toPlain() {
    return this.normalizedValue;
  }

  toJSON() {
    return this.normalizedValue;
  }
}

export class CustomerId extends BigIntValueObject {
  private readonly currentId: bigint;

  constructor(value: bigint) {
    super(value);
    this.currentId = value;
  }

  toJSON() {
    return this.currentId.toString();
  }

  toString() {
    return this.toJSON();
  }
}

export class SignupDate extends DateValueObject {
  private readonly currentDate: Date;

  constructor(value: Date) {
    super(value);
    this.currentDate = new Date(value.getTime());
  }

  static fromString(value: string) {
    return new SignupDate(new Date(value));
  }

  static fromDate(value: Date) {
    return new SignupDate(value);
  }

  toJSON() {
    return this.currentDate.toISOString();
  }

  toString() {
    return this.toJSON();
  }

  toNumber() {
    return this.currentDate.getTime();
  }
}

@ValueObjectFactoryFor(CustomerId)
export class CustomerIdFactory extends InjectableValueObjectFactory<CustomerId> {
  fromBigInt(value: bigint) {
    return new CustomerId(value);
  }
}

export interface CreateCustomerInput {
  email: EmailAddress;
  displayName: DisplayName;
  budget: BudgetAmount;
  preferences: CustomerPreferences;
}

type StoredCustomer = CreateCustomerInput & {
  id: CustomerId;
  createdAt: SignupDate;
};

@Service()
export class ValueObjectsDemoService {
  private currentSequence = 1000n;
  private readonly customers = new Map<string, StoredCustomer>();
  private readonly emailFactory = createValueObjectFactory(EmailAddress);

  constructor(
    private readonly logger: Logger,
    private readonly customerIdFactory: CustomerIdFactory
  ) {}

  describeExamples() {
    const email = this.emailFactory.fromString(" USER@Example.com ");
    const budget = BudgetAmount.fromString("249.995");
    const preferences = CustomerPreferences.fromJSON('{"locale":"es","marketing":true}');
    const signupDate = SignupDate.fromString("2026-03-23T10:30:00.000Z");

    return {
      sample: "18-value_objects_app",
      normalizedEmail: email.toString(),
      emailEquality: email.equals(EmailAddress.fromString("user@example.com")),
      budget: {
        value: budget.toNumber(),
        formatted: this.formatBudget(budget),
      },
      preferences: {
        plain: preferences.toPlain(),
        json: preferences.toJSON(),
      },
      signupDate: {
        iso: signupDate.toJSON(),
        timestamp: signupDate.toNumber(),
      },
    };
  }

  createCustomer(input: CreateCustomerInput) {
    const customer = this.storeCustomer(input);

    this.logger.info(`Stored value object sample customer ${customer.id.toJSON()} for ${customer.email.toString()}`);

    return {
      ...this.toResponse(customer),
      duplicateEmailCheck: customer.email.equals(EmailAddress.fromString(customer.email.toString().toUpperCase())),
    };
  }

  listCustomers() {
    return Array.from(this.customers.values()).map((customer) => this.toResponse(customer));
  }

  findCustomer(id: string) {
    const customer = this.customers.get(id);

    if (!customer) {
      return {
        found: false,
        id,
      };
    }

    return {
      found: true,
      customer: this.toResponse(customer),
    };
  }

  private storeCustomer(input: CreateCustomerInput): StoredCustomer {
    const customer: StoredCustomer = {
      ...input,
      id: this.customerIdFactory.fromBigInt(++this.currentSequence),
      createdAt: SignupDate.fromDate(new Date()),
    };

    this.customers.set(customer.id.toJSON(), customer);

    return customer;
  }

  private toResponse(customer: StoredCustomer) {
    return {
      id: customer.id.toJSON(),
      email: customer.email.toJSON(),
      displayName: customer.displayName.toJSON(),
      budget: {
        value: customer.budget.toNumber(),
        formatted: this.formatBudget(customer.budget),
      },
      preferences: customer.preferences.toPlain(),
      createdAt: customer.createdAt.toJSON(),
    };
  }

  private formatBudget(budget: BudgetAmount) {
    return `$${budget.toNumber().toFixed(2)}`;
  }
}