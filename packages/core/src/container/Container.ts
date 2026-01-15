import { DependencyLifetime } from './DependencyLifetime.js';

export interface RegistrationOptions {
  lifetime?: DependencyLifetime;
  constructArgs?: any[];
}

export interface Container {
  resolve<T>(token: string | symbol): T;
  registerClass<T>(
    token: string | symbol,
    classConstructor: new (...args: any[]) => T,
    options?: RegistrationOptions
  ): void;
  registerFunction<T>(token: string | symbol, func: () => T, options?: RegistrationOptions): void;
  registerValue<T>(token: string | symbol, value: T): void;
  dispose(): Promise<void>;
  createScope(): Container;
}
