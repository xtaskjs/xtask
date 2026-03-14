import { GuardLike, RouteExecutionContext } from "@xtaskjs/common";
import { ForbiddenError } from "@xtaskjs/core";
import { SecurityAuthenticationService } from "./authentication";
import { SecurityAuthorizationService } from "./authorization";
import { resolveSecurityMetadata } from "./metadata";

const AUTHENTICATION_GUARD_STATE_KEY = "xtask:security:authentication-checked";
const AUTHORIZATION_GUARD_STATE_KEY = "xtask:security:authorization-checked";

const authenticationService = new SecurityAuthenticationService();
const authorizationService = new SecurityAuthorizationService();

export const authenticationGuard: GuardLike = {
  async canActivate(context: RouteExecutionContext): Promise<boolean> {
    if (context.state[AUTHENTICATION_GUARD_STATE_KEY]) {
      return true;
    }

    const metadata = resolveSecurityMetadata(context.controller?.constructor, context.handler);
    if (metadata.allowAnonymous) {
      context.state[AUTHENTICATION_GUARD_STATE_KEY] = true;
      return true;
    }

    await authenticationService.authenticate(context, metadata.strategies);
    context.state[AUTHENTICATION_GUARD_STATE_KEY] = true;
    return true;
  },
};

export const authorizationGuard: GuardLike = {
  async canActivate(context: RouteExecutionContext): Promise<boolean> {
    if (context.state[AUTHORIZATION_GUARD_STATE_KEY]) {
      return true;
    }

    const metadata = resolveSecurityMetadata(context.controller?.constructor, context.handler);
    if (metadata.allowAnonymous || metadata.roles.length === 0) {
      context.state[AUTHORIZATION_GUARD_STATE_KEY] = true;
      return true;
    }

    if (!context.auth.isAuthenticated) {
      await authenticationGuard.canActivate(context);
    }

    if (!authorizationService.isAuthorized(context.auth, metadata.roles, metadata.roleMode)) {
      throw new ForbiddenError("Forbidden", {
        message: "Forbidden",
        requiredRoles: metadata.roles,
        actualRoles: context.auth.roles,
      });
    }

    context.state[AUTHORIZATION_GUARD_STATE_KEY] = true;
    return true;
  },
};