import {
  CurrencyFormatOptions,
  DateFormatOptions,
  InternationalizationFormatter,
  PluralTranslation,
  RegisteredInternationalizationLocaleOptions,
  TranslateOptions,
  TranslationDictionary,
  TranslationValue,
} from "./types";
import { getInternationalizationLifecycleManager } from "./lifecycle";

const PLURAL_CATEGORIES = new Set(["zero", "one", "two", "few", "many", "other"]);
const INTERPOLATION_EXPRESSION = /\{\{\s*([^}]+?)\s*\}\}/g;
const BUILT_IN_FORMATTERS = new Set(["number", "currency", "date", "datetime"]);

const resolvePath = (
  source: TranslationDictionary | undefined,
  path: string
): TranslationValue | undefined => {
  return path.split(".").reduce((current: any, segment) => current?.[segment], source as any);
};

type FormatterName = "number" | "currency" | "date" | "datetime";

type ParsedInterpolation = {
  path: string;
  formatter?: FormatterName;
  formatterOptions: Record<string, any>;
};

const parseInterpolationOptionValue = (value: string): any => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }

  if (trimmedValue === "true") {
    return true;
  }

  if (trimmedValue === "false") {
    return false;
  }

  if (trimmedValue === "null") {
    return null;
  }

  const numericValue = Number(trimmedValue);
  if (!Number.isNaN(numericValue) && trimmedValue !== "") {
    return numericValue;
  }

  return trimmedValue;
};

const parseInterpolation = (expression: string): ParsedInterpolation | undefined => {
  const parts = expression
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const path = parts[0];
  if (!path) {
    return undefined;
  }

  const formatter = parts[1] as FormatterName | undefined;
  const formatterOptions = parts.slice(2).reduce<Record<string, any>>((options, item) => {
    const separatorIndex = item.indexOf("=");
    if (separatorIndex <= 0) {
      return options;
    }

    const key = item.slice(0, separatorIndex).trim();
    const value = item.slice(separatorIndex + 1);
    if (!key) {
      return options;
    }

    options[key] = parseInterpolationOptionValue(value);
    return options;
  }, {});

  return {
    path,
    formatter,
    formatterOptions,
  };
};

const parseTranslationKey = (
  key: string,
  namespace?: string
): { namespace?: string; key: string } => {
  if (namespace) {
    return { namespace, key };
  }

  const separatorIndex = key.indexOf(":");
  if (separatorIndex <= 0) {
    return { key };
  }

  return {
    namespace: key.slice(0, separatorIndex),
    key: key.slice(separatorIndex + 1),
  };
};

const isPluralTranslation = (value: TranslationValue | undefined): value is PluralTranslation => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);
  if (keys.length === 0) {
    return false;
  }

  return keys.every((key) => PLURAL_CATEGORIES.has(key) || /^=\d+$/.test(key));
};

const selectPluralMessage = (
  value: PluralTranslation,
  locale: string,
  count: number,
  ordinal = false
): string | undefined => {
  const exactMatch = value[`=${count}`];
  if (typeof exactMatch === "string") {
    return exactMatch;
  }

  const category = new Intl.PluralRules(locale, {
    type: ordinal ? "ordinal" : "cardinal",
  }).select(count);

  return value[category] || value.other;
};

const toValidDate = (value: Date | string | number): Date => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("InternationalizationService received an invalid date value");
  }
  return date;
};

const stripCurrencyOptions = (
  options: CurrencyFormatOptions
): Intl.NumberFormatOptions => {
  const { locale: _locale, currency: _currency, ...numberOptions } = options;
  return numberOptions;
};

const stripDateOptions = (options: DateFormatOptions): Intl.DateTimeFormatOptions => {
  const { locale: _locale, timeZone: _timeZone, ...dateOptions } = options;
  return dateOptions;
};

export class InternationalizationService {
  t(key: string, options: TranslateOptions = {}): string {
    return this.translate(key, options);
  }

  async tAsync(key: string, options: TranslateOptions = {}): Promise<string> {
    return this.translateAsync(key, options);
  }

  translate(key: string, options: TranslateOptions = {}): string {
    const lifecycleManager = getInternationalizationLifecycleManager();
    const context = lifecycleManager.getRequestContext();
    const parsedKey = parseTranslationKey(key, options.namespace);
    const locale = lifecycleManager.resolveLocale(options.locale || context?.locale);
    const fallbackLocale = lifecycleManager.resolveLocale(
      options.fallbackLocale || lifecycleManager.getConfiguration().fallbackLocale
    );
    const message = this.resolveMessage(parsedKey.key, [locale, fallbackLocale], parsedKey.namespace);

    if (message === undefined) {
      return options.defaultValue ?? key;
    }

    return this.resolveMessageValue(message, locale, options, key);
  }

  async translateAsync(key: string, options: TranslateOptions = {}): Promise<string> {
    const lifecycleManager = getInternationalizationLifecycleManager();
    const context = lifecycleManager.getRequestContext();
    const parsedKey = parseTranslationKey(key, options.namespace);
    const locale = lifecycleManager.resolveLocale(options.locale || context?.locale);
    const fallbackLocale = lifecycleManager.resolveLocale(
      options.fallbackLocale || lifecycleManager.getConfiguration().fallbackLocale
    );

    if (parsedKey.namespace) {
      await lifecycleManager.ensureNamespaceLoaded(parsedKey.namespace, locale);
      if (fallbackLocale !== locale) {
        await lifecycleManager.ensureNamespaceLoaded(parsedKey.namespace, fallbackLocale);
      }
    }

    const message = this.resolveMessage(parsedKey.key, [locale, fallbackLocale], parsedKey.namespace);
    if (message === undefined) {
      return options.defaultValue ?? key;
    }

    return this.resolveMessageValue(message, locale, options, key);
  }

  hasTranslation(key: string, locale?: string): boolean {
    const lifecycleManager = getInternationalizationLifecycleManager();
    const parsedKey = parseTranslationKey(key);
    const resolvedLocale = lifecycleManager.resolveLocale(locale || lifecycleManager.getRequestContext()?.locale);
    return this.resolveMessage(parsedKey.key, [resolvedLocale], parsedKey.namespace) !== undefined;
  }

  formatCurrency(value: number, options: CurrencyFormatOptions = {}): string {
    const lifecycleManager = getInternationalizationLifecycleManager();
    const context = lifecycleManager.getRequestContext();
    const locale = lifecycleManager.resolveLocale(options.locale || context?.locale);
    const localeDefinition = lifecycleManager.getLocaleDefinition(locale);
    const currency =
      options.currency ||
      context?.currency ||
      localeDefinition?.currency ||
      lifecycleManager.getConfiguration().defaultCurrency;

    if (!currency) {
      throw new Error("Currency formatting requires a configured currency");
    }

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      ...stripCurrencyOptions(options),
    }).format(value);
  }

  formatDate(value: Date | string | number, options: DateFormatOptions = {}): string {
    const lifecycleManager = getInternationalizationLifecycleManager();
    const context = lifecycleManager.getRequestContext();
    const locale = lifecycleManager.resolveLocale(options.locale || context?.locale);
    const localeDefinition = lifecycleManager.getLocaleDefinition(locale);
    const timeZone =
      options.timeZone ||
      context?.timeZone ||
      localeDefinition?.timeZone ||
      lifecycleManager.getConfiguration().defaultTimeZone;
    const dateOptions = stripDateOptions(options);

    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      ...dateOptions,
      timeZone: timeZone || dateOptions.timeZone,
    }).format(toValidDate(value));
  }

  formatDateTime(value: Date | string | number, options: DateFormatOptions = {}): string {
    const lifecycleManager = getInternationalizationLifecycleManager();
    const context = lifecycleManager.getRequestContext();
    const locale = lifecycleManager.resolveLocale(options.locale || context?.locale);
    const localeDefinition = lifecycleManager.getLocaleDefinition(locale);
    const timeZone =
      options.timeZone ||
      context?.timeZone ||
      localeDefinition?.timeZone ||
      lifecycleManager.getConfiguration().defaultTimeZone;
    const dateOptions = stripDateOptions(options);

    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      ...dateOptions,
      timeZone: timeZone || dateOptions.timeZone,
    }).format(toValidDate(value));
  }

  getCurrentLocale(): string {
    const lifecycleManager = getInternationalizationLifecycleManager();
    return lifecycleManager.resolveLocale(lifecycleManager.getRequestContext()?.locale);
  }

  listLocales(): string[] {
    return getInternationalizationLifecycleManager().listLocales();
  }

  listNamespaces(locale?: string): string[] {
    return getInternationalizationLifecycleManager().listNamespaces(locale);
  }

  async loadNamespace(namespace: string, locale?: string): Promise<boolean> {
    const translations = await getInternationalizationLifecycleManager().ensureNamespaceLoaded(
      namespace,
      locale
    );
    return Boolean(translations);
  }

  async runWithLocale<T>(
    locale: string,
    callback: () => Promise<T> | T,
    overrides: { currency?: string; timeZone?: string } = {}
  ): Promise<T> {
    return getInternationalizationLifecycleManager().runWithContext(
      {
        locale,
        currency: overrides.currency,
        timeZone: overrides.timeZone,
      },
      callback
    );
  }

  private resolveMessage(
    key: string,
    locales: string[],
    namespace?: string
  ): TranslationValue | undefined {
    const lifecycleManager = getInternationalizationLifecycleManager();
    const localeDefinitions: RegisteredInternationalizationLocaleOptions[] = locales
      .map((locale) => lifecycleManager.getLocaleDefinition(locale))
      .filter((value): value is RegisteredInternationalizationLocaleOptions => Boolean(value));

    for (const localeDefinition of localeDefinitions) {
      const source = namespace
        ? lifecycleManager.getNamespaceTranslations(localeDefinition.locale, namespace)
        : localeDefinition.translations;
      const message = resolvePath(source, key);
      if (message !== undefined) {
        return message;
      }
    }

    return undefined;
  }

  private resolveMessageValue(
    value: TranslationValue,
    locale: string,
    options: TranslateOptions,
    originalKey: string
  ): string {
    const params = {
      ...(options.params || {}),
      ...(typeof options.count === "number" ? { count: options.count } : {}),
    };

    if (typeof value === "string") {
      return this.interpolateTemplate(value, locale, params);
    }

    if (isPluralTranslation(value)) {
      if (typeof options.count !== "number") {
        return options.defaultValue ?? originalKey;
      }

      const pluralMessage = selectPluralMessage(value, locale, options.count, options.ordinal);
      if (!pluralMessage) {
        return options.defaultValue ?? originalKey;
      }

      return this.interpolateTemplate(pluralMessage, locale, params);
    }

    return options.defaultValue ?? originalKey;
  }

  private interpolateTemplate(
    template: string,
    locale: string,
    params: Record<string, any>
  ): string {
    return template.replace(INTERPOLATION_EXPRESSION, (_match, expression: string) => {
      const parsed = parseInterpolation(expression);
      if (!parsed) {
        return "";
      }

      const rawValue = parsed.path
        .split(".")
        .reduce((current: any, segment) => current?.[segment], params as any);

      if (rawValue === undefined || rawValue === null) {
        return "";
      }

      if (!parsed.formatter) {
        return String(rawValue);
      }

      return this.formatInterpolationValue(
        rawValue,
        locale,
        parsed.formatter,
        parsed.formatterOptions,
        params
      );
    });
  }

  private formatInterpolationValue(
    rawValue: any,
    locale: string,
    formatter: string,
    formatterOptions: Record<string, any>,
    params: Record<string, any>
  ): string {
    if (!BUILT_IN_FORMATTERS.has(formatter)) {
      return this.applyCustomFormatter(rawValue, locale, formatter, formatterOptions, params);
    }

    if (formatter === "number") {
      const numericValue = Number(rawValue);
      if (Number.isNaN(numericValue)) {
        return String(rawValue);
      }

      return new Intl.NumberFormat(locale, formatterOptions as Intl.NumberFormatOptions).format(numericValue);
    }

    if (formatter === "currency") {
      const numericValue = Number(rawValue);
      if (Number.isNaN(numericValue)) {
        return String(rawValue);
      }

      return this.formatCurrency(numericValue, {
        locale,
        ...(formatterOptions as CurrencyFormatOptions),
      });
    }

    if (formatter === "date") {
      return this.formatDate(rawValue, {
        locale,
        ...(formatterOptions as DateFormatOptions),
      });
    }

    if (formatter === "datetime") {
      return this.formatDateTime(rawValue, {
        locale,
        ...(formatterOptions as DateFormatOptions),
      });
    }

    return String(rawValue);
  }

  private applyCustomFormatter(
    rawValue: any,
    locale: string,
    formatterName: string,
    formatterOptions: Record<string, any>,
    params: Record<string, any>
  ): string {
    const lifecycleManager = getInternationalizationLifecycleManager();
    const formatter = lifecycleManager.getFormatter(formatterName);
    if (!formatter) {
      return String(rawValue);
    }

    return this.invokeFormatter(formatter, formatterName, rawValue, locale, formatterOptions, params);
  }

  private invokeFormatter(
    formatter: InternationalizationFormatter,
    formatterName: string,
    rawValue: any,
    locale: string,
    formatterOptions: Record<string, any>,
    params: Record<string, any>
  ): string {
    const lifecycleManager = getInternationalizationLifecycleManager();
    const formattedValue = formatter({
      name: formatterName,
      locale,
      value: rawValue,
      options: formatterOptions,
      params,
      request: lifecycleManager.getRequestContext()?.request,
      container: lifecycleManager.getContainer(),
    });

    if (formattedValue === undefined || formattedValue === null) {
      return "";
    }

    return String(formattedValue);
  }
}