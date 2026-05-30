import type { ConfigServiceLike } from "./types";

export class ConfigService<TConfig extends Record<string, unknown> = Record<string, unknown>>
  implements ConfigServiceLike<TConfig>
{
  private readonly values: Readonly<TConfig>;

  constructor(values: TConfig) {
    this.values = Object.freeze({ ...values });
  }

  get<K extends keyof TConfig>(key: K): TConfig[K] {
    return this.values[key];
  }

  getOrUndefined<K extends keyof TConfig>(key: K): TConfig[K] | undefined {
    return this.values[key];
  }

  getOrDefault<K extends keyof TConfig>(key: K, defaultValue: TConfig[K]): TConfig[K] {
    const value = this.values[key];
    return value === undefined ? defaultValue : value;
  }

  has<K extends keyof TConfig>(key: K): boolean {
    return Object.prototype.hasOwnProperty.call(this.values, key);
  }

  getAll(): Readonly<TConfig> {
    return this.values;
  }
}
