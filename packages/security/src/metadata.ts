import { ResolvedSecurityMetadata, RolesOptions, SecurityRoleMatchingMode } from "./types";

const CLASS_SECURITY_METADATA_KEY = Symbol("xtask:security:class");
const METHOD_SECURITY_METADATA_KEY = Symbol("xtask:security:method");

type MutableSecurityMetadata = Partial<ResolvedSecurityMetadata>;

const emptyMetadata = (): MutableSecurityMetadata => ({
  allowAnonymous: false,
  strategies: [],
  roles: [],
  roleMode: "any",
});

const uniqueStrings = (values: string[]): string[] => {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  );
};

const getClassMetadata = (target: any): MutableSecurityMetadata => {
  return Reflect.getMetadata(CLASS_SECURITY_METADATA_KEY, target) || emptyMetadata();
};

const setClassMetadata = (target: any, metadata: MutableSecurityMetadata): void => {
  Reflect.defineMetadata(CLASS_SECURITY_METADATA_KEY, metadata, target);
};

const getMethodMetadataMap = (target: any): Map<PropertyKey, MutableSecurityMetadata> => {
  const stored = Reflect.getMetadata(METHOD_SECURITY_METADATA_KEY, target) as
    | Map<PropertyKey, MutableSecurityMetadata>
    | undefined;
  return stored || new Map<PropertyKey, MutableSecurityMetadata>();
};

const setMethodMetadataMap = (target: any, metadataMap: Map<PropertyKey, MutableSecurityMetadata>): void => {
  Reflect.defineMetadata(METHOD_SECURITY_METADATA_KEY, metadataMap, target);
};

const getOrCreateMethodMetadata = (target: any, propertyKey: PropertyKey): MutableSecurityMetadata => {
  const metadataMap = getMethodMetadataMap(target.constructor);
  const current = metadataMap.get(propertyKey) || emptyMetadata();
  metadataMap.set(propertyKey, current);
  setMethodMetadataMap(target.constructor, metadataMap);
  return current;
};

export const normalizeStrategies = (strategies?: string | string[]): string[] => {
  if (!strategies) {
    return [];
  }

  return uniqueStrings(Array.isArray(strategies) ? strategies : [strategies]);
};

export const setAuthenticatedMetadata = (
  target: any,
  propertyKey: PropertyKey | undefined,
  strategies?: string | string[]
): void => {
  const normalizedStrategies = normalizeStrategies(strategies);
  if (propertyKey === undefined) {
    const current = getClassMetadata(target);
    current.allowAnonymous = false;
    current.strategies = uniqueStrings([...(current.strategies || []), ...normalizedStrategies]);
    setClassMetadata(target, current);
    return;
  }

  const current = getOrCreateMethodMetadata(target, propertyKey);
  current.allowAnonymous = false;
  current.strategies = uniqueStrings([...(current.strategies || []), ...normalizedStrategies]);
};

export const setRolesMetadata = (
  target: any,
  propertyKey: PropertyKey | undefined,
  options: RolesOptions
): void => {
  const roles = uniqueStrings(options.roles || []);
  const strategies = normalizeStrategies(options.strategies);
  const roleMode: SecurityRoleMatchingMode = options.mode || "any";

  if (propertyKey === undefined) {
    const current = getClassMetadata(target);
    current.roles = uniqueStrings([...(current.roles || []), ...roles]);
    current.strategies = uniqueStrings([...(current.strategies || []), ...strategies]);
    current.roleMode = roleMode;
    setClassMetadata(target, current);
    return;
  }

  const current = getOrCreateMethodMetadata(target, propertyKey);
  current.roles = uniqueStrings([...(current.roles || []), ...roles]);
  current.strategies = uniqueStrings([...(current.strategies || []), ...strategies]);
  current.roleMode = roleMode;
};

export const setAllowAnonymousMetadata = (target: any, propertyKey?: PropertyKey): void => {
  if (propertyKey === undefined) {
    const current = getClassMetadata(target);
    current.allowAnonymous = true;
    setClassMetadata(target, current);
    return;
  }

  const current = getOrCreateMethodMetadata(target, propertyKey);
  current.allowAnonymous = true;
};

export const resolveSecurityMetadata = (
  controllerType: any,
  handler?: PropertyKey
): ResolvedSecurityMetadata => {
  const classMetadata = controllerType ? getClassMetadata(controllerType) : emptyMetadata();
  const methodMetadata =
    controllerType && handler !== undefined
      ? getMethodMetadataMap(controllerType).get(handler) || emptyMetadata()
      : emptyMetadata();

  const allowAnonymous = Boolean(
    methodMetadata.allowAnonymous ?? classMetadata.allowAnonymous ?? false
  );
  const strategies = uniqueStrings([
    ...(classMetadata.strategies || []),
    ...(methodMetadata.strategies || []),
  ]);
  const roles = uniqueStrings([...(classMetadata.roles || []), ...(methodMetadata.roles || [])]);

  return {
    allowAnonymous,
    strategies,
    roles,
    roleMode: methodMetadata.roleMode || classMetadata.roleMode || "any",
  };
};