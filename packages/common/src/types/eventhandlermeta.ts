import { LifeCyclePhase } from "./lifecycle-events";

export interface EventHandlerMeta {
  phase: LifeCyclePhase;
  method: string | symbol;
  priority: number;
}
