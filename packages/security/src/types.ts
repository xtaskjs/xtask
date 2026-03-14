import type { Container } from "@xtaskjs/core";

export type SecurityStrategyKind = "jwt" | "jwe";
export type SecurityRoleMatchingMode = "any" | "all";
export type SecurityTokenExtractor = (request: any) => string | null | undefined;
export type SecurityRoleExtractor = (payload: Record<string, any>, user: any) => string[] | undefined;

export interface SecurityValidationContext {
  request: any;
  response?: any;
  token: string;
  strategyName: string;
  kind: SecurityStrategyKind;
  container?: Container;
}

export type SecurityValidateFn = (
  payload: Record<string, any>,
  context: SecurityValidationContext
) => any | false | Promise<any | false>;

interface BaseSecurityStrategyOptions {
  name?: string;
  default?: boolean;
  jwtFromRequest?: SecurityTokenExtractor;
  extractRoles?: SecurityRoleExtractor;
  validate?: SecurityValidateFn;
}

export interface JwtSecurityStrategyOptions extends BaseSecurityStrategyOptions {
  kind?: "jwt";
  secretOrKey?: any;
  secretOrKeyProvider?: any;
  issuer?: string | string[];
  audience?: string | string[];
  algorithms?: string[];
  ignoreExpiration?: boolean;
  jsonWebTokenOptions?: Record<string, any>;
  passReqToCallback?: boolean;
}

export interface JweSecurityStrategyOptions extends BaseSecurityStrategyOptions {
  kind?: "jwe";
  decryptionKey?: any;
  resolveDecryptionKey?: () => any | Promise<any>;
  issuer?: string | string[];
  audience?: string | string[];
  clockTolerance?: number | string;
}

export type SecurityStrategyOptions = JwtSecurityStrategyOptions | JweSecurityStrategyOptions;

export interface RegisteredJwtSecurityStrategyOptions extends JwtSecurityStrategyOptions {
  kind: "jwt";
  name: string;
}

export interface RegisteredJweSecurityStrategyOptions extends JweSecurityStrategyOptions {
  kind: "jwe";
  name: string;
}

export type RegisteredSecurityStrategyOptions =
  | RegisteredJwtSecurityStrategyOptions
  | RegisteredJweSecurityStrategyOptions;

export interface ResolvedSecurityMetadata {
  allowAnonymous: boolean;
  strategies: string[];
  roles: string[];
  roleMode: SecurityRoleMatchingMode;
}

export interface AuthenticatedOptions {
  strategies?: string | string[];
}

export interface RolesOptions {
  roles: string[];
  mode?: SecurityRoleMatchingMode;
  strategies?: string | string[];
}

export interface SecurityAuthenticationResult {
  success: boolean;
  statusCode?: number;
  challenge?: any;
  strategy?: string;
  token?: string;
  user?: any;
  claims?: Record<string, any>;
  roles: string[];
  info?: any;
}