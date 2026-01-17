import { DependencyLifetime } from './DependencyLifetime.js';

export type ConstructorParams<C> = C extends new (arg: infer P) => any ? P : never;

export interface RegistrationOptions {
  lifetime?: DependencyLifetime;
  localInjections?: any;
}

export interface Container {
  resolve<T>(token: string | symbol): T;
  registerClass<T, C extends new (arg: any) => T>(
    token: string | symbol,
    classConstructor: C,
    options?: {
      lifetime?: DependencyLifetime;
      localInjections?: Partial<ConstructorParams<C>>;
    }
  ): void;
  registerFunction<T>(token: string | symbol, func: () => T, options?: RegistrationOptions): void;
  registerValue<T>(token: string | symbol, value: T): void;
  dispose(): Promise<void>;
  createScope(): Container;
}
