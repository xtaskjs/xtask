import { HANDLERS_KEY } from "./constants";
import { EventHandlerMeta , LifeCyclePhase } from "../../../types";

export function OnEvent(phase: LifeCyclePhase, priority = 0): MethodDecorator {
  return (target, propertyKey) => {
    const handlers: EventHandlerMeta[] = Reflect.getMetadata(HANDLERS_KEY, target.constructor) || [];
    handlers.push({ phase, method: propertyKey, priority });
    Reflect.defineMetadata(HANDLERS_KEY, handlers, target.constructor);
  };
}
