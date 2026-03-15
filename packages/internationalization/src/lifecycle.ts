import { AsyncLocalStorage } from "async_hooks";
import { Container } from "@xtaskjs/core";
import {
  getInternationalizationConfiguration,
  getRegisteredInternationalizationFormatters,
  getRegisteredInternationalizationNamespaceLoaders,
  getRegisteredInternationalizationLocaleResolvers,
  getRegisteredInternationalizationLocales,
  normalizeLocaleTag,
  resetInternationalizationConfiguration,
} from "./configuration";
import { InternationalizationService } from "./internationalization.service";
import {
  InternationalizationRequestContext,
  InternationalizationResolvedContext,
  InternationalizationNamespaceLoader,
  TranslationDictionary,
  InternationalizationFormatter,
  RegisteredInternationalizationLocaleOptions,
  RegisteredInternationalizationOptions,
} from "./types";
import {
  getInternationalizationLifecycleToken,
  getInternationalizationServiceToken,
} from "./tokens";

const requestContextStorage = new AsyncLocalStorage<InternationalizationRequestContext>();

const getInsensitiveHeader = (request: any, name: string): string | undefined => {
  const headers = request?.headers;
  if (!headers || typeof headers !== "object") {
    return undefined;
  }

  const normalizedName = name.toLowerCase();
  for (const [headerName, value] of Object.entries(headers)) {
    if (headerName.toLowerCase() !== normalizedName) {
      continue;
    }

    if (Array.isArray(value)) {
      return typeof value[0] === "string" ? value[0] : undefined;
    }

    return typeof value === "string" ? value : undefined;
  }

  return undefined;
};

const getQueryValue = (request: any, ...keys: string[]): string | undefined => {
  const query = request?.query;
  if (!query || typeof query !== "object") {
    return undefined;
  }

  for (const key of keys) {
    const value = query[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
};

const parseAcceptLanguage = (value?: string): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((segment) => {
      const [locale, ...parameters] = segment.trim().split(";");
      const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith("q="));
      const quality = qualityParameter ? Number(qualityParameter.trim().slice(2)) : 1;
      return {
        locale: locale.trim(),
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((candidate) => candidate.locale.length > 0 && candidate.locale !== "*")
    .sort((left, right) => right.quality - left.quality)
    .map((candidate) => candidate.locale);
};

const toLocaleLookupKey = (locale?: string): string | undefined => {
  return normalizeLocaleTag(locale)?.toLowerCase();
};

const resolveBaseLanguage = (locale?: string): string | undefined => {
  const normalizedLocale = normalizeLocaleTag(locale);
  if (!normalizedLocale) {
    return undefined;
  }

  return normalizedLocale.split("-")[0]?.toLowerCase();
};

export class InternationalizationLifecycleManager {
  private configuration: RegisteredInternationalizationOptions = getInternationalizationConfiguration();
  private locales = new Map<string, RegisteredInternationalizationLocaleOptions>();
  private resolvers = getRegisteredInternationalizationLocaleResolvers();
  private namespaceLoaders = new Map<string, InternationalizationNamespaceLoader>();
  private formatters = new Map<string, InternationalizationFormatter>();
  private loadedNamespaces = new Map<string, Map<string, TranslationDictionary>>();
  private container?: Container;

  async initialize(container?: Container): Promise<void> {
    this.configuration = getInternationalizationConfiguration();
    this.locales = new Map(
      getRegisteredInternationalizationLocales().map((definition) => [
        toLocaleLookupKey(definition.locale)!,
        definition,
      ])
    );
    this.resolvers = getRegisteredInternationalizationLocaleResolvers();
    this.namespaceLoaders = getRegisteredInternationalizationNamespaceLoaders();
    this.formatters = getRegisteredInternationalizationFormatters();
    this.loadedNamespaces.clear();
    this.container = container;
    this.registerContainerBindings(container);
  }

  async destroy(): Promise<void> {
    this.loadedNamespaces.clear();
    this.container = undefined;
  }

  getContainer(): Container | undefined {
    return this.container;
  }

  getFormatter(name: string): InternationalizationFormatter | undefined {
    return this.formatters.get(name.trim());
  }

  getConfiguration(): RegisteredInternationalizationOptions {
    return { ...this.configuration };
  }

  listLocales(): string[] {
    return Array.from(this.locales.values()).map((definition) => definition.locale);
  }

  listNamespaces(locale?: string): string[] {
    const resolvedLocale = this.resolveLocale(locale || this.getRequestContext()?.locale);
    const definition = this.getLocaleDefinition(resolvedLocale);
    const loaded = this.loadedNamespaces.get(toLocaleLookupKey(resolvedLocale) || "");

    return Array.from(
      new Set([
        ...Object.keys(definition?.namespaces || {}),
        ...Array.from(loaded?.keys() || []),
      ])
    ).sort();
  }

  getLocaleDefinition(locale?: string): RegisteredInternationalizationLocaleOptions | undefined {
    const resolvedLocale = this.resolveLocale(locale);
    const exactMatch = this.locales.get(toLocaleLookupKey(resolvedLocale)!);
    if (exactMatch) {
      return exactMatch;
    }

    const baseLanguage = resolveBaseLanguage(resolvedLocale);
    if (!baseLanguage) {
      return undefined;
    }

    return Array.from(this.locales.values()).find(
      (definition) => resolveBaseLanguage(definition.locale) === baseLanguage
    );
  }

  resolveLocale(locale?: string): string {
    const requestedLocale = normalizeLocaleTag(locale);
    const candidates = [
      requestedLocale,
      this.configuration.defaultLocale,
      this.configuration.fallbackLocale,
      this.listLocales()[0],
    ].filter((value): value is string => typeof value === "string" && value.length > 0);

    for (const candidate of candidates) {
      const exactMatch = this.locales.get(toLocaleLookupKey(candidate)!);
      if (exactMatch) {
        return exactMatch.locale;
      }

      const baseLanguage = resolveBaseLanguage(candidate);
      if (!baseLanguage) {
        continue;
      }

      const languageMatch = Array.from(this.locales.values()).find(
        (definition) => resolveBaseLanguage(definition.locale) === baseLanguage
      );
      if (languageMatch) {
        return languageMatch.locale;
      }
    }

    return requestedLocale || this.configuration.defaultLocale || this.configuration.fallbackLocale || "en";
  }

  getRequestContext(): InternationalizationRequestContext | undefined {
    return requestContextStorage.getStore();
  }

  getNamespaceTranslations(locale: string, namespace: string): TranslationDictionary | undefined {
    const resolvedLocale = this.resolveLocale(locale);
    const lookupKey = toLocaleLookupKey(resolvedLocale);
    const definition = this.getLocaleDefinition(resolvedLocale);
    const staticNamespace = definition?.namespaces?.[namespace];
    if (staticNamespace) {
      return staticNamespace;
    }

    if (!lookupKey) {
      return undefined;
    }

    return this.loadedNamespaces.get(lookupKey)?.get(namespace);
  }

  async ensureNamespaceLoaded(namespace: string, locale?: string): Promise<TranslationDictionary | undefined> {
    const normalizedNamespace = namespace.trim();
    if (!normalizedNamespace) {
      throw new Error("Internationalization namespace requires a non-empty name");
    }

    const resolvedLocale = this.resolveLocale(locale || this.getRequestContext()?.locale);
    const existingTranslations = this.getNamespaceTranslations(resolvedLocale, normalizedNamespace);
    if (existingTranslations) {
      return existingTranslations;
    }

    const loader = this.namespaceLoaders.get(normalizedNamespace);
    if (!loader) {
      return undefined;
    }

    const translations = await loader({
      locale: resolvedLocale,
      namespace: normalizedNamespace,
      container: this.container,
      locales: getRegisteredInternationalizationLocales(),
      configuration: this.getConfiguration(),
    });

    if (!translations) {
      return undefined;
    }

    const lookupKey = toLocaleLookupKey(resolvedLocale)!;
    const localeNamespaces = this.loadedNamespaces.get(lookupKey) || new Map<string, TranslationDictionary>();
    localeNamespaces.set(normalizedNamespace, translations);
    this.loadedNamespaces.set(lookupKey, localeNamespaces);
    return translations;
  }

  async resolveRequestContext(request?: any): Promise<InternationalizationRequestContext> {
    const builtInContext = this.resolveBuiltInContext(request);
    const resolvedContext: InternationalizationResolvedContext = {
      ...builtInContext,
    };

    const resolverContext = {
      request,
      container: this.container,
      locales: getRegisteredInternationalizationLocales(),
      configuration: this.getConfiguration(),
    };

    for (const resolver of this.resolvers) {
      const value = await resolver(resolverContext);
      if (typeof value === "string") {
        resolvedContext.locale = value;
        continue;
      }

      if (value && typeof value === "object") {
        if (value.locale) {
          resolvedContext.locale = value.locale;
        }
        if (value.currency) {
          resolvedContext.currency = value.currency;
        }
        if (value.timeZone) {
          resolvedContext.timeZone = value.timeZone;
        }
      }
    }

    const locale = this.resolveLocale(resolvedContext.locale);
    const localeDefinition = this.getLocaleDefinition(locale);

    return {
      request,
      locale,
      currency:
        resolvedContext.currency || localeDefinition?.currency || this.configuration.defaultCurrency,
      timeZone:
        resolvedContext.timeZone || localeDefinition?.timeZone || this.configuration.defaultTimeZone,
    };
  }

  async runWithRequestContext<T>(request: any, callback: () => Promise<T> | T): Promise<T> {
    const context = await this.resolveRequestContext(request);
    return requestContextStorage.run(context, () => Promise.resolve(callback()));
  }

  async runWithContext<T>(
    value: InternationalizationResolvedContext & { request?: any },
    callback: () => Promise<T> | T
  ): Promise<T> {
    const currentContext = this.getRequestContext();
    const locale = this.resolveLocale(value.locale || currentContext?.locale);
    const localeDefinition = this.getLocaleDefinition(locale);
    const nextContext: InternationalizationRequestContext = {
      request: value.request ?? currentContext?.request,
      locale,
      currency:
        value.currency ||
        currentContext?.currency ||
        localeDefinition?.currency ||
        this.configuration.defaultCurrency,
      timeZone:
        value.timeZone ||
        currentContext?.timeZone ||
        localeDefinition?.timeZone ||
        this.configuration.defaultTimeZone,
    };

    return requestContextStorage.run(nextContext, () => Promise.resolve(callback()));
  }

  private resolveBuiltInContext(request?: any): InternationalizationResolvedContext {
    const requestedLocale =
      getQueryValue(request, "locale", "lang", "language") ||
      getInsensitiveHeader(request, "x-locale") ||
      getInsensitiveHeader(request, "content-language") ||
      parseAcceptLanguage(getInsensitiveHeader(request, "accept-language")).find((locale) => Boolean(locale));

    return {
      locale: requestedLocale,
      currency:
        getQueryValue(request, "currency") ||
        getInsensitiveHeader(request, "x-currency"),
      timeZone:
        getQueryValue(request, "timeZone", "timezone") ||
        getInsensitiveHeader(request, "x-time-zone") ||
        getInsensitiveHeader(request, "x-timezone"),
    };
  }

  private registerContainerBindings(container?: Container): void {
    if (!container) {
      return;
    }

    const anyContainer = container as any;
    if (typeof anyContainer.registerNamedInstance === "function") {
      anyContainer.registerNamedInstance(getInternationalizationLifecycleToken(), this);
    }

    if (typeof anyContainer.registerWithName === "function") {
      anyContainer.registerWithName(
        InternationalizationService,
        { scope: "singleton" },
        getInternationalizationServiceToken()
      );
    }
  }
}

const lifecycleManager = new InternationalizationLifecycleManager();

export const initializeInternationalizationIntegration = async (
  container?: Container
): Promise<void> => {
  await lifecycleManager.initialize(container);
};

export const shutdownInternationalizationIntegration = async (): Promise<void> => {
  await lifecycleManager.destroy();
};

export const getInternationalizationLifecycleManager = (): InternationalizationLifecycleManager => {
  return lifecycleManager;
};

export const getCurrentInternationalizationContext = (): InternationalizationRequestContext | undefined => {
  return lifecycleManager.getRequestContext();
};

export const runWithInternationalizationContext = async <T>(
  request: any,
  callback: () => Promise<T> | T
): Promise<T> => {
  return lifecycleManager.runWithRequestContext(request, callback);
};

export const resetInternationalizationIntegration = async (): Promise<void> => {
  await shutdownInternationalizationIntegration();
  resetInternationalizationConfiguration();
};