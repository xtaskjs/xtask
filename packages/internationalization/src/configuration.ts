import type {
  InternationalizationFormatter,
  InternationalizationLocaleOptions,
  InternationalizationLocaleResolver,
  InternationalizationNamespaceLoader,
  InternationalizationNamespaceOptions,
  InternationalizationOptions,
  RegisteredInternationalizationLocaleOptions,
  RegisteredInternationalizationOptions,
} from "./types";

const DEFAULT_LOCALE = "en";

const defaultConfiguration = (): RegisteredInternationalizationOptions => ({
  defaultLocale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
});

let registeredConfiguration = defaultConfiguration();
const registeredLocales = new Map<string, RegisteredInternationalizationLocaleOptions>();
const registeredResolvers: InternationalizationLocaleResolver[] = [];
const registeredNamespaceLoaders = new Map<string, InternationalizationNamespaceLoader>();
const registeredFormatters = new Map<string, InternationalizationFormatter>();

const normalizeNamespace = (value: string): string => {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    throw new Error("Internationalization namespace requires a non-empty name");
  }
  return normalizedValue;
};

export const normalizeLocaleTag = (value?: string): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return undefined;
  }

  try {
    return Intl.getCanonicalLocales(normalizedValue)[0];
  } catch {
    return normalizedValue;
  }
};

const toLocaleLookupKey = (value?: string): string | undefined => {
  const normalizedLocale = normalizeLocaleTag(value);
  return normalizedLocale?.toLowerCase();
};

export const configureInternationalization = (
  options: InternationalizationOptions
): RegisteredInternationalizationOptions => {
  const defaultLocale = normalizeLocaleTag(options.defaultLocale) || registeredConfiguration.defaultLocale;
  const fallbackLocale = normalizeLocaleTag(options.fallbackLocale) || defaultLocale;

  registeredConfiguration = {
    ...registeredConfiguration,
    ...options,
    defaultLocale,
    fallbackLocale,
  };

  return { ...registeredConfiguration };
};

export const getInternationalizationConfiguration = (): RegisteredInternationalizationOptions => {
  return { ...registeredConfiguration };
};

export const clearInternationalizationConfiguration = (): void => {
  registeredConfiguration = defaultConfiguration();
};

export const registerInternationalizationLocale = (
  options: InternationalizationLocaleOptions
): RegisteredInternationalizationLocaleOptions => {
  const locale = normalizeLocaleTag(options.locale);
  if (!locale) {
    throw new Error("Internationalization locale requires a non-empty locale");
  }

  const definition: RegisteredInternationalizationLocaleOptions = {
    ...options,
    locale,
  };
  registeredLocales.set(toLocaleLookupKey(locale)!, definition);
  return definition;
};

export const registerI18nLocale = registerInternationalizationLocale;

export const registerInternationalizationNamespace = (
  options: InternationalizationNamespaceOptions
): RegisteredInternationalizationLocaleOptions => {
  const locale = normalizeLocaleTag(options.locale);
  if (!locale) {
    throw new Error("Internationalization namespace requires a valid locale");
  }

  const namespace = normalizeNamespace(options.namespace);
  const key = toLocaleLookupKey(locale)!;
  const existingDefinition = registeredLocales.get(key);
  const definition: RegisteredInternationalizationLocaleOptions = {
    locale,
    currency: existingDefinition?.currency,
    timeZone: existingDefinition?.timeZone,
    translations: existingDefinition?.translations,
    namespaces: {
      ...(existingDefinition?.namespaces || {}),
      [namespace]: options.translations,
    },
  };

  registeredLocales.set(key, definition);
  return definition;
};

export const registerI18nNamespace = registerInternationalizationNamespace;

export const getRegisteredInternationalizationLocales = (): RegisteredInternationalizationLocaleOptions[] => {
  return Array.from(registeredLocales.values());
};

export const clearRegisteredInternationalizationLocales = (): void => {
  registeredLocales.clear();
};

export const registerInternationalizationNamespaceLoader = (
  namespace: string,
  loader: InternationalizationNamespaceLoader
): InternationalizationNamespaceLoader => {
  registeredNamespaceLoaders.set(normalizeNamespace(namespace), loader);
  return loader;
};

export const registerI18nNamespaceLoader = registerInternationalizationNamespaceLoader;

export const getRegisteredInternationalizationNamespaceLoaders = (): Map<string, InternationalizationNamespaceLoader> => {
  return new Map(registeredNamespaceLoaders.entries());
};

export const clearRegisteredInternationalizationNamespaceLoaders = (): void => {
  registeredNamespaceLoaders.clear();
};

export const registerInternationalizationFormatter = (
  name: string,
  formatter: InternationalizationFormatter
): InternationalizationFormatter => {
  registeredFormatters.set(normalizeNamespace(name), formatter);
  return formatter;
};

export const registerI18nFormatter = registerInternationalizationFormatter;

export const getRegisteredInternationalizationFormatters = (): Map<string, InternationalizationFormatter> => {
  return new Map(registeredFormatters.entries());
};

export const clearRegisteredInternationalizationFormatters = (): void => {
  registeredFormatters.clear();
};

export const registerInternationalizationLocaleResolver = (
  resolver: InternationalizationLocaleResolver
): InternationalizationLocaleResolver => {
  registeredResolvers.push(resolver);
  return resolver;
};

export const registerI18nLocaleResolver = registerInternationalizationLocaleResolver;

export const getRegisteredInternationalizationLocaleResolvers = (): InternationalizationLocaleResolver[] => {
  return [...registeredResolvers];
};

export const clearRegisteredInternationalizationLocaleResolvers = (): void => {
  registeredResolvers.length = 0;
};

export const Internationalization = (options: InternationalizationOptions): ClassDecorator => {
  return () => {
    configureInternationalization(options);
  };
};

export const I18nConfiguration = Internationalization;

export const InternationalizationLocale = (
  options: InternationalizationLocaleOptions
): ClassDecorator => {
  return () => {
    registerInternationalizationLocale(options);
  };
};

export const I18nLocale = InternationalizationLocale;

export const InternationalizationResolver = (
  resolver: InternationalizationLocaleResolver
): ClassDecorator => {
  return () => {
    registerInternationalizationLocaleResolver(resolver);
  };
};

export const I18nLocaleResolver = InternationalizationResolver;

export const resetInternationalizationConfiguration = (): void => {
  clearInternationalizationConfiguration();
  clearRegisteredInternationalizationFormatters();
  clearRegisteredInternationalizationLocales();
  clearRegisteredInternationalizationLocaleResolvers();
  clearRegisteredInternationalizationNamespaceLoaders();
};