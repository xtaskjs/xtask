export const SECURITY_PASSPORT_TOKEN = "xtask:security:passport";
export const SECURITY_LIFECYCLE_TOKEN = "xtask:security:lifecycle";
export const SECURITY_AUTHENTICATION_SERVICE_TOKEN = "xtask:security:authentication-service";
export const SECURITY_AUTHORIZATION_SERVICE_TOKEN = "xtask:security:authorization-service";

export const getPassportToken = (): string => SECURITY_PASSPORT_TOKEN;

export const getSecurityLifecycleToken = (): string => SECURITY_LIFECYCLE_TOKEN;

export const getAuthenticationServiceToken = (): string => {
  return SECURITY_AUTHENTICATION_SERVICE_TOKEN;
};

export const getAuthorizationServiceToken = (): string => {
  return SECURITY_AUTHORIZATION_SERVICE_TOKEN;
};