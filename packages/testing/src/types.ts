export type Type<T = any> = new (...args: any[]) => T;

export type InjectionToken<T = any> = Type<T> | string | symbol;

export type ProviderScope = "singleton" | "transient";

export interface ClassProvider<T = any> {
  provide: InjectionToken<T>;
  useClass: Type<T>;
  scope?: ProviderScope;
}

export interface ValueProvider<T = any> {
  provide: InjectionToken<T>;
  useValue: T;
}

export interface FactoryProvider<T = any> {
  provide: InjectionToken<T>;
  useFactory: (...dependencies: any[]) => T;
  inject?: InjectionToken[];
  scope?: ProviderScope;
}

export type Provider<T = any> = Type<T> | ClassProvider<T> | ValueProvider<T> | FactoryProvider<T>;

export interface TestingModuleMetadata {
  imports?: Array<Type | TestingModuleMetadata>;
  providers?: Provider[];
  exports?: InjectionToken[];
}

export interface ProviderOverride<T = any> {
  provide: InjectionToken<T>;
  useClass?: Type<T>;
  useValue?: T;
  useFactory?: (...dependencies: any[]) => T;
  inject?: InjectionToken[];
  scope?: ProviderScope;
}

export interface RuntimeProviderRecord<T = any> {
  token: InjectionToken<T>;
  scope: ProviderScope;
  factory: () => T;
  created: boolean;
  instance?: T;
}

export interface ProviderDescriptor {
  token: InjectionToken;
  provider: Provider | ProviderOverride;
  componentMeta?: {
    scope?: "singleton" | "transient";
    name?: string;
  };
}
