import { AutoWired, Qualifier } from "@xtaskjs/core";
import { getBotAdapterToken, getBotsLifecycleToken, getBotsServiceToken } from "../tokens";

const createInjectionDecorator = (token: string): ParameterDecorator & PropertyDecorator => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    if (typeof parameterIndex === "number") {
      Qualifier(token)(target, propertyKey, parameterIndex);
      return;
    }

    if (propertyKey !== undefined) {
      AutoWired({ qualifier: token })(target, propertyKey);
    }
  };
};

export const InjectBotsService = (): ParameterDecorator & PropertyDecorator => {
  return createInjectionDecorator(getBotsServiceToken());
};

export const InjectBotsLifecycleManager = (): ParameterDecorator & PropertyDecorator => {
  return createInjectionDecorator(getBotsLifecycleToken());
};

export const InjectBotAdapter = (platform: string): ParameterDecorator & PropertyDecorator => {
  return createInjectionDecorator(getBotAdapterToken(platform));
};
