import { RouteExecutionContext } from "@xtaskjs/common";
import { UnauthorizedError } from "@xtaskjs/core";
import { getSecurityLifecycleManager } from "./lifecycle";
import { SecurityAuthenticationResult } from "./types";

export class SecurityAuthenticationService {
  async authenticate(
    context: RouteExecutionContext,
    strategyNames?: string | string[]
  ): Promise<SecurityAuthenticationResult> {
    const result = await getSecurityLifecycleManager().authenticateContext(context, strategyNames);
    if (!result.success) {
      throw new UnauthorizedError(result.challenge?.message || "Unauthorized", {
        message: result.challenge?.message || "Unauthorized",
      });
    }
    return result;
  }

  async authenticateRequest(
    request: any,
    response?: any,
    strategyNames?: string | string[]
  ): Promise<SecurityAuthenticationResult> {
    return getSecurityLifecycleManager().authenticateRequest(request, response, strategyNames);
  }
}