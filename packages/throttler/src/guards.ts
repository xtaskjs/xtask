import { GuardLike, RouteExecutionContext } from "@xtaskjs/common";
import { HttpError } from "@xtaskjs/core";
import { getThrottlerConfiguration } from "./configuration";
import { getThrottleMetadata } from "./metadata";
import { ThrottleKeyContext } from "./types";

const THROTTLER_CHECKED_KEY = "xtask:throttler:checked";

const buildKeyContext = (context: RouteExecutionContext): ThrottleKeyContext => ({
  request: context.request,
  method: context.method,
  path: context.path,
});

const resolveService = (): any | undefined => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const lifecycle = require("./lifecycle");
    return lifecycle.getThrottlerLifecycleManager?.()?.getService?.();
  } catch {
    return undefined;
  }
};

export const throttlerGuard: GuardLike = {
  async canActivate(context: RouteExecutionContext): Promise<boolean> {
    if (context.state[THROTTLER_CHECKED_KEY]) {
      return true;
    }

    const constructor = context.controller?.constructor;
    const handler = context.handler;

    const methodMetadata =
      constructor && handler ? getThrottleMetadata(constructor, handler) : undefined;
    const classMetadata = constructor ? getThrottleMetadata(constructor) : undefined;
    const metadata = methodMetadata || classMetadata;

    if (!metadata) {
      context.state[THROTTLER_CHECKED_KEY] = true;
      return true;
    }

    const globalConfig = getThrottlerConfiguration();
    const keyContext = buildKeyContext(context);

    const skipIf = metadata.options?.skipIf || globalConfig.skipIf;
    if (skipIf) {
      const skip = await skipIf(keyContext);
      if (skip) {
        context.state[THROTTLER_CHECKED_KEY] = true;
        return true;
      }
    }

    const keyGenerator = metadata.options?.keyGenerator || globalConfig.keyGenerator;
    const key = await keyGenerator(keyContext);

    const service = resolveService();
    if (!service) {
      context.state[THROTTLER_CHECKED_KEY] = true;
      return true;
    }

    const result = await service.check(key, metadata.limit, metadata.ttlMs);

    if (!result.allowed) {
      const errorMessage = metadata.options?.errorMessage || globalConfig.errorMessage;
      throw new HttpError(429, errorMessage, {
        message: errorMessage,
        limit: result.limit,
        ttlMs: result.ttlMs,
        resetAt: result.resetAt,
      });
    }

    context.state[THROTTLER_CHECKED_KEY] = true;
    return true;
  },
};
