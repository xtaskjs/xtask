import {
  JweSecurityStrategyOptions,
  JwtSecurityStrategyOptions,
  RegisteredJweSecurityStrategyOptions,
  RegisteredJwtSecurityStrategyOptions,
  RegisteredSecurityStrategyOptions,
} from "./types";

const DEFAULT_STRATEGY_NAME = "default";
const registeredStrategies = new Map<string, RegisteredSecurityStrategyOptions>();

const resolveStrategyName = (
  kind: RegisteredSecurityStrategyOptions["kind"],
  requestedName?: string
): string => {
  if (typeof requestedName === "string" && requestedName.trim().length > 0) {
    return requestedName.trim();
  }

  if (!registeredStrategies.has(DEFAULT_STRATEGY_NAME)) {
    return DEFAULT_STRATEGY_NAME;
  }

  return `${kind}-${registeredStrategies.size + 1}`;
};

export const registerJwtStrategy = (
  options: JwtSecurityStrategyOptions
): RegisteredJwtSecurityStrategyOptions => {
  const name = resolveStrategyName("jwt", options.name);
  const definition: RegisteredJwtSecurityStrategyOptions = {
    ...options,
    kind: "jwt",
    name,
  };
  registeredStrategies.set(name, definition);
  return definition;
};

export const registerJweStrategy = (
  options: JweSecurityStrategyOptions
): RegisteredJweSecurityStrategyOptions => {
  const name = resolveStrategyName("jwe", options.name);
  const definition: RegisteredJweSecurityStrategyOptions = {
    ...options,
    kind: "jwe",
    name,
  };
  registeredStrategies.set(name, definition);
  return definition;
};

export const getRegisteredSecurityStrategies = (): RegisteredSecurityStrategyOptions[] => {
  return Array.from(registeredStrategies.values());
};

export const clearRegisteredSecurityStrategies = (): void => {
  registeredStrategies.clear();
};

export const getDefaultSecurityStrategyName = (): string | undefined => {
  const explicitDefault = Array.from(registeredStrategies.values()).find(
    (definition) => definition.default === true
  );
  if (explicitDefault) {
    return explicitDefault.name;
  }

  if (registeredStrategies.size === 1) {
    return Array.from(registeredStrategies.keys())[0];
  }

  if (registeredStrategies.has(DEFAULT_STRATEGY_NAME)) {
    return DEFAULT_STRATEGY_NAME;
  }

  return undefined;
};

export const JwtSecurityStrategy = (options: JwtSecurityStrategyOptions): ClassDecorator => {
  return () => {
    registerJwtStrategy(options);
  };
};

export const JweSecurityStrategy = (options: JweSecurityStrategyOptions): ClassDecorator => {
  return () => {
    registerJweStrategy(options);
  };
};