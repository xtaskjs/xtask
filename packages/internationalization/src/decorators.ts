import { AutoWired, Qualifier } from "@xtaskjs/core";
import {
  getInternationalizationLifecycleToken,
  getInternationalizationServiceToken,
} from "./tokens";

export const InjectInternationalizationService = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getInternationalizationServiceToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const InjectI18nService = InjectInternationalizationService;

export const InjectInternationalizationLifecycleManager = (): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = getInternationalizationLifecycleToken();
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const InjectI18nLifecycleManager = InjectInternationalizationLifecycleManager;