import { RouteExecutionContext } from "@xtaskjs/common";
import { AutoWired, Container, Qualifier } from "@xtaskjs/core";
import passport from "passport";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import {
  clearRegisteredSecurityStrategies,
  getDefaultSecurityStrategyName,
  getRegisteredSecurityStrategies,
} from "./configuration";
import {
  getAuthenticationServiceToken,
  getAuthorizationServiceToken,
  getPassportToken,
  getSecurityLifecycleToken,
} from "./tokens";
import { SecurityAuthorizationService } from "./authorization";
import { SecurityAuthenticationService } from "./authentication";
import {
  RegisteredJwtSecurityStrategyOptions,
  RegisteredSecurityStrategyOptions,
  SecurityAuthenticationResult,
} from "./types";
import { JweStrategy, defaultBearerTokenExtractor, resolveValidatedUser } from "./strategies";

type PassportOutcome =
  | { type: "success"; user: any; info?: any }
  | { type: "fail"; challenge?: any; statusCode?: number }
  | { type: "pass" };

const createPassportInstance = (): any => {
  const PassportConstructor = (passport as any).Passport || (passport as any).Authenticator;
  return new PassportConstructor();
};

const createSafeExtractor = (extractor: (request: any) => any) => {
  return (request: any) => {
    try {
      return extractor(request);
    } catch {
      return null;
    }
  };
};

const toRecord = (value: any): Record<string, any> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  return {};
};

const uniqueRoles = (roles: string[]): string[] => {
  return Array.from(new Set(roles.filter((value) => value.length > 0)));
};

const resolveClaims = (user: any, info: any): Record<string, any> => {
  if (info?.claims) {
    return toRecord(info.claims);
  }

  if (user?.claims) {
    return toRecord(user.claims);
  }

  return {};
};

const resolveRoles = (
  definition: RegisteredSecurityStrategyOptions,
  claims: Record<string, any>,
  user: any
): string[] => {
  const extracted = definition.extractRoles?.(claims, user);
  if (Array.isArray(extracted)) {
    return uniqueRoles(extracted.map((value) => String(value).trim()));
  }

  if (Array.isArray(user?.roles)) {
    return uniqueRoles(user.roles.map((value: any) => String(value).trim()));
  }

  if (Array.isArray(claims.roles)) {
    return uniqueRoles(claims.roles.map((value: any) => String(value).trim()));
  }

  if (typeof claims.scope === "string") {
    return uniqueRoles(
      claims.scope
        .split(/\s+/)
        .map((value: string) => value.trim())
        .filter((value: string) => value.length > 0)
    );
  }

  return [];
};

export class SecurityLifecycleManager {
  private passportInstance: any = createPassportInstance();
  private readonly strategyDefinitions = new Map<string, RegisteredSecurityStrategyOptions>();
  private container?: Container;

  async initialize(container?: Container): Promise<void> {
    this.passportInstance = createPassportInstance();
    this.strategyDefinitions.clear();
    this.container = container;

    for (const definition of getRegisteredSecurityStrategies()) {
      this.strategyDefinitions.set(definition.name, definition);
      if (definition.kind === "jwt") {
        this.registerJwtStrategy(definition);
        continue;
      }

      this.passportInstance.use(
        definition.name,
        new JweStrategy(definition, () => ({ container: this.container }))
      );
    }

    this.registerContainerBindings(container);
  }

  async destroy(): Promise<void> {
    this.passportInstance = createPassportInstance();
    this.strategyDefinitions.clear();
    this.container = undefined;
  }

  getPassport(): any {
    return this.passportInstance;
  }

  async authenticateContext(
    context: RouteExecutionContext,
    strategyNames?: string | string[]
  ): Promise<SecurityAuthenticationResult> {
    const result = await this.authenticateRequest(context.request, context.response, strategyNames);
    if (!result.success) {
      return result;
    }

    context.auth = {
      isAuthenticated: true,
      strategy: result.strategy,
      token: result.token,
      user: result.user,
      claims: result.claims,
      roles: [...result.roles],
    };

    if (context.request && typeof context.request === "object") {
      context.request.user = result.user;
      context.request.auth = context.auth;
      context.request.authInfo = result.info;
    }

    if (context.response && typeof context.response === "object") {
      context.response.locals = context.response.locals || {};
      context.response.locals.auth = context.auth;
    }

    return result;
  }

  async authenticateRequest(
    request: any,
    _response?: any,
    strategyNames?: string | string[]
  ): Promise<SecurityAuthenticationResult> {
    const selectedStrategies = this.resolveStrategyNames(strategyNames);
    let lastFailure: { statusCode?: number; challenge?: any } = {
      statusCode: 401,
      challenge: { message: "Unauthorized" },
    };

    for (const strategyName of selectedStrategies) {
      const definition = this.strategyDefinitions.get(strategyName);
      if (!definition) {
        throw new Error(`Security strategy '${strategyName}' is not registered`);
      }

      const extractor = definition.jwtFromRequest || defaultBearerTokenExtractor;
      const token = extractor(request) || undefined;
      const outcome = await this.runPassportStrategy(strategyName, request);

      if (outcome.type === "success") {
        const claims = resolveClaims(outcome.user, outcome.info);
        return {
          success: true,
          strategy: strategyName,
          token,
          user: outcome.user,
          claims,
          roles: resolveRoles(definition, claims, outcome.user),
          info: outcome.info,
        };
      }

      if (outcome.type === "fail") {
        lastFailure = { statusCode: outcome.statusCode, challenge: outcome.challenge };
      }
    }

    return {
      success: false,
      statusCode: lastFailure.statusCode || 401,
      challenge: lastFailure.challenge || { message: "Unauthorized" },
      roles: [],
    };
  }

  private resolveStrategyNames(strategyNames?: string | string[]): string[] {
    if (Array.isArray(strategyNames) && strategyNames.length > 0) {
      return strategyNames;
    }

    if (typeof strategyNames === "string" && strategyNames.trim().length > 0) {
      return [strategyNames.trim()];
    }

    const defaultStrategy = getDefaultSecurityStrategyName();
    if (defaultStrategy) {
      return [defaultStrategy];
    }

    throw new Error("No security strategy registered. Call registerJwtStrategy() or registerJweStrategy().");
  }

  private registerJwtStrategy(definition: RegisteredJwtSecurityStrategyOptions): void {
    const extractor = createSafeExtractor(
      definition.jwtFromRequest || ExtractJwt.fromAuthHeaderAsBearerToken()
    );
    const options: any = {
      jwtFromRequest: extractor,
      secretOrKey: definition.secretOrKey,
      secretOrKeyProvider: definition.secretOrKeyProvider,
      issuer: definition.issuer,
      audience: definition.audience,
      algorithms: definition.algorithms,
      ignoreExpiration: definition.ignoreExpiration,
      jsonWebTokenOptions: definition.jsonWebTokenOptions,
      passReqToCallback: definition.passReqToCallback === true,
    };

    const verify = async (...args: any[]) => {
      const done = args[args.length - 1];
      const request = definition.passReqToCallback ? args[0] : undefined;
      const payload = toRecord(definition.passReqToCallback ? args[1] : args[0]);

      try {
        const token = extractor(request) || "";
        const user = await resolveValidatedUser(definition, payload, {
          container: this.container,
          request,
          token,
          strategyName: definition.name,
          kind: definition.kind,
        });

        if (!user) {
          done(null, false, { message: "Unauthorized", claims: payload });
          return;
        }

        done(null, user, {
          claims: payload,
          strategy: definition.name,
          kind: definition.kind,
        });
      } catch (error) {
        done(error);
      }
    };

    this.passportInstance.use(definition.name, new JwtStrategy(options, verify));
  }

  private runPassportStrategy(strategyName: string, request: any): Promise<PassportOutcome> {
    const strategy = this.passportInstance._strategy(strategyName);
    if (!strategy) {
      throw new Error(`Passport strategy '${strategyName}' is not registered`);
    }

    return new Promise<PassportOutcome>((resolve, reject) => {
      const delegate = Object.create(strategy);
      Object.assign(delegate, strategy);
      delegate.success = (user: any, info?: any) => resolve({ type: "success", user, info });
      delegate.fail = (challenge?: any, statusCode?: number) =>
        resolve({ type: "fail", challenge, statusCode });
      delegate.pass = () => resolve({ type: "pass" });
      delegate.error = (error: Error) => reject(error);
      delegate.redirect = (_url: string, statusCode?: number) =>
        resolve({
          type: "fail",
          challenge: { message: "Redirect responses are not supported by xtaskjs security guards" },
          statusCode: statusCode || 401,
        });
      delegate.authenticate(request, {});
    });
  }

  private registerContainerBindings(container?: Container): void {
    if (!container) {
      return;
    }

    const anyContainer = container as any;
    if (typeof anyContainer.registerWithName === "function") {
      anyContainer.registerWithName(
        SecurityAuthenticationService,
        { scope: "singleton" },
        getAuthenticationServiceToken()
      );
      anyContainer.registerWithName(
        SecurityAuthorizationService,
        { scope: "singleton" },
        getAuthorizationServiceToken()
      );
    }

    if (typeof anyContainer.registerNamedInstance === "function") {
      anyContainer.registerNamedInstance(getPassportToken(), this.passportInstance);
      anyContainer.registerNamedInstance(getSecurityLifecycleToken(), this);
    }
  }
}

const lifecycleManager = new SecurityLifecycleManager();

export const initializeSecurityIntegration = async (container?: Container): Promise<void> => {
  await lifecycleManager.initialize(container);
};

export const shutdownSecurityIntegration = async (): Promise<void> => {
  await lifecycleManager.destroy();
};

export const getSecurityLifecycleManager = (): SecurityLifecycleManager => {
  return lifecycleManager;
};

export const resetSecurityIntegration = async (): Promise<void> => {
  await shutdownSecurityIntegration();
  clearRegisteredSecurityStrategies();
};

export const InjectAuthenticationService = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getAuthenticationServiceToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const InjectAuthorizationService = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getAuthorizationServiceToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const InjectPassport = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getPassportToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const InjectSecurityLifecycleManager = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getSecurityLifecycleToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};