/* eslint-disable @typescript-eslint/no-explicit-any */
import { DependencyLifetime } from '../types/DependencyLifetime.js';
import { ConstructorParamsType } from '../types/UtilityTypes.js';

export interface RegistrationOptions {
  lifetime?: DependencyLifetime;
  localInjections?: any;
}

export interface Container {
  registerClass<T, C extends new (arg: any) => T>(
    token: string | symbol,
    classConstructor: C,
    options?: {
      lifetime?: DependencyLifetime;
      localInjections?: Partial<ConstructorParamsType<C>>;
    }
  ): void;
  registerFunction<T>(token: string | symbol, func: () => T, options?: RegistrationOptions): void;
  registerValue<T>(token: string | symbol, value: T): void;
  resolve<T>(token: string | symbol): T;
  dispose(): Promise<void>;
  createScope(): Container;
  registrationMap(): Map<string, RegistrationOptions>;
}
