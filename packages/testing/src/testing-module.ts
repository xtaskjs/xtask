import { InjectionToken } from "./types";

export interface RuntimeInjector {
  get<T>(token: InjectionToken<T>): T;
  has(token: InjectionToken): boolean;
  destroy(): void;
}

export class TestingModule {
  constructor(private readonly injector: RuntimeInjector) {}

  get<T>(token: InjectionToken<T>): T {
    return this.injector.get(token);
  }

  resolve<T>(token: InjectionToken<T>): Promise<T> {
    return Promise.resolve(this.get(token));
  }

  has(token: InjectionToken): boolean {
    return this.injector.has(token);
  }

  close(): Promise<void> {
    this.injector.destroy();
    return Promise.resolve();
  }
}
