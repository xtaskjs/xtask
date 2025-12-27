import { RunnerMeta } from '@xtaskjs/core';
import { RUNNERS_KEY } from './constants';

export function CommandLineRunner(priority = 0): MethodDecorator {
  return (target, propertyKey) => {
    const runners: RunnerMeta[] = Reflect.getMetadata(RUNNERS_KEY, target.constructor) || [];
    runners.push({ type: "CommandLineRunner", method: propertyKey, priority });
    Reflect.defineMetadata(RUNNERS_KEY, runners, target.constructor);
  };
}