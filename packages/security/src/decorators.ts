import { UseGuards } from "@xtaskjs/common";
import { authenticationGuard, authorizationGuard } from "./guards";
import {
  normalizeStrategies,
  setAllowAnonymousMetadata,
  setAuthenticatedMetadata,
  setRolesMetadata,
} from "./metadata";
import { AuthenticatedOptions, RolesOptions } from "./types";

const applyDecorator = (
  decorator: MethodDecorator & ClassDecorator,
  target: any,
  propertyKey?: string | symbol,
  descriptor?: PropertyDescriptor
): void => {
  if (propertyKey === undefined) {
    decorator(target);
    return;
  }

  decorator(target, propertyKey, descriptor!);
};

const normalizeAuthenticatedOptions = (
  value?: string | string[] | AuthenticatedOptions
): AuthenticatedOptions => {
  if (!value) {
    return {};
  }

  if (typeof value === "string" || Array.isArray(value)) {
    return { strategies: value };
  }

  return value;
};

export const Authenticated = (
  value?: string | string[] | AuthenticatedOptions
): MethodDecorator & ClassDecorator => {
  const options = normalizeAuthenticatedOptions(value);
  const strategies = normalizeStrategies(options.strategies);
  const guardDecorator = UseGuards(authenticationGuard);

  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    setAuthenticatedMetadata(target, propertyKey, strategies);
    applyDecorator(guardDecorator, target, propertyKey, descriptor);
  };
};

export const Auth = Authenticated;

const normalizeRolesOptions = (value: RolesOptions | string, roles: string[]): RolesOptions => {
  if (typeof value === "string") {
    return { roles: [value, ...roles] };
  }

  return value;
};

export const Roles = (
  value: RolesOptions | string,
  ...roles: string[]
): MethodDecorator & ClassDecorator => {
  const options = normalizeRolesOptions(value, roles);
  const guardDecorator = UseGuards(authorizationGuard);

  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    setRolesMetadata(target, propertyKey, options);
    applyDecorator(guardDecorator, target, propertyKey, descriptor);
  };
};

export const AllowAnonymous = (): MethodDecorator & ClassDecorator => {
  return (target: any, propertyKey?: string | symbol) => {
    setAllowAnonymousMetadata(target, propertyKey);
  };
};