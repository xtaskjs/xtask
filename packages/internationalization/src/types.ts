import type { Container } from "@xtaskjs/core";

export interface PluralTranslation {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other?: string;
  [key: string]: string | undefined;
}

export type TranslationValue = string | TranslationDictionary | PluralTranslation;

export interface TranslationDictionary {
  [key: string]: TranslationValue;
}

export interface InternationalizationOptions {
  defaultLocale?: string;
  fallbackLocale?: string;
  defaultCurrency?: string;
  defaultTimeZone?: string;
}

export interface RegisteredInternationalizationOptions {
  defaultLocale: string;
  fallbackLocale: string;
  defaultCurrency?: string;
  defaultTimeZone?: string;
}

export interface InternationalizationLocaleOptions {
  locale: string;
  currency?: string;
  timeZone?: string;
  translations?: TranslationDictionary;
  namespaces?: Record<string, TranslationDictionary>;
}

export interface RegisteredInternationalizationLocaleOptions
  extends InternationalizationLocaleOptions {
  locale: string;
}

export interface InternationalizationResolvedContext {
  locale?: string;
  currency?: string;
  timeZone?: string;
}

export interface InternationalizationRequestContext extends InternationalizationResolvedContext {
  locale: string;
  request?: any;
}

export interface InternationalizationResolverContext {
  request?: any;
  container?: Container;
  locales: RegisteredInternationalizationLocaleOptions[];
  configuration: RegisteredInternationalizationOptions;
}

export type InternationalizationLocaleResolver = (
  context: InternationalizationResolverContext
) =>
  | string
  | InternationalizationResolvedContext
  | undefined
  | Promise<string | InternationalizationResolvedContext | undefined>;

export interface InternationalizationNamespaceOptions {
  locale: string;
  namespace: string;
  translations: TranslationDictionary;
}

export interface InternationalizationNamespaceLoaderContext {
  locale: string;
  namespace: string;
  container?: Container;
  locales: RegisteredInternationalizationLocaleOptions[];
  configuration: RegisteredInternationalizationOptions;
}

export type InternationalizationNamespaceLoader = (
  context: InternationalizationNamespaceLoaderContext
) => TranslationDictionary | undefined | Promise<TranslationDictionary | undefined>;

export interface InternationalizationFormatterContext {
  name: string;
  locale: string;
  value: any;
  options: Record<string, any>;
  params: Record<string, any>;
  request?: any;
  container?: Container;
}

export type InternationalizationFormatter = (
  context: InternationalizationFormatterContext
) => any;

export interface TranslateOptions {
  locale?: string;
  fallbackLocale?: string;
  namespace?: string;
  params?: Record<string, any>;
  count?: number;
  ordinal?: boolean;
  defaultValue?: string;
}

export type CurrencyFormatOptions = Intl.NumberFormatOptions & {
  locale?: string;
  currency?: string;
};

export type DateFormatOptions = Intl.DateTimeFormatOptions & {
  locale?: string;
  timeZone?: string;
};