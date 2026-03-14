import { RouteAuthenticationContext, RouteExecutionContext } from "@xtaskjs/common";
import { SecurityRoleMatchingMode } from "./types";

const normalizeRoles = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return input
      .map((value) => String(value || "").trim())
      .filter((value) => value.length > 0);
  }

  if (typeof input === "string") {
    return input
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  return [];
};

export class SecurityAuthorizationService {
  getRoles(source: RouteExecutionContext | RouteAuthenticationContext | any): string[] {
    if (!source) {
      return [];
    }

    if (Array.isArray(source.roles)) {
      return normalizeRoles(source.roles);
    }

    if (source.auth && Array.isArray(source.auth.roles)) {
      return normalizeRoles(source.auth.roles);
    }

    if (Array.isArray(source.user?.roles) || typeof source.user?.roles === "string") {
      return normalizeRoles(source.user.roles);
    }

    if (Array.isArray(source.claims?.roles) || typeof source.claims?.roles === "string") {
      return normalizeRoles(source.claims.roles);
    }

    if (typeof source.claims?.scope === "string") {
      return normalizeRoles(source.claims.scope);
    }

    return [];
  }

  isAuthorized(
    source: RouteExecutionContext | RouteAuthenticationContext | any,
    requiredRoles: string[],
    mode: SecurityRoleMatchingMode = "any"
  ): boolean {
    if (requiredRoles.length === 0) {
      return true;
    }

    const grantedRoles = new Set(this.getRoles(source));
    if (mode === "all") {
      return requiredRoles.every((role) => grantedRoles.has(role));
    }

    return requiredRoles.some((role) => grantedRoles.has(role));
  }
}