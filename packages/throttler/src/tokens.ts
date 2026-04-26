const THROTTLER_SERVICE_TOKEN = "xtask:throttler:service";
const THROTTLER_LIFECYCLE_TOKEN = "xtask:throttler:lifecycle";

export const getThrottlerServiceToken = (): string => THROTTLER_SERVICE_TOKEN;

export const getThrottlerLifecycleToken = (): string => THROTTLER_LIFECYCLE_TOKEN;
