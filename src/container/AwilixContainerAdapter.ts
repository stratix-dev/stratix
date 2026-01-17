import { AwilixContainer, asFunction, asValue, asClass } from 'awilix';
import { ConstructorParams, Container, RegistrationOptions } from './Container.js';
import { DependencyLifetime } from './DependencyLifetime.js';

export class AwilixContainerAdapter implements Container {
  private readonly awilixContainer: AwilixContainer;
  private readonly symbolMap = new Map<symbol, string>();

  constructor({ awilixContainer }: { awilixContainer: AwilixContainer }) {
    this.awilixContainer = awilixContainer;
  }

  resolve<T>(token: string | symbol): T {
    const key = this.getTokenKey(token);
    return this.awilixContainer.resolve<T>(key);
  }

  registerClass<T, C extends new (arg: any) => T>(
    token: string | symbol,
    classConstructor: C,
    options?: {
      lifetime?: DependencyLifetime;
      localInjections?: Partial<ConstructorParams<C>>;
    }
  ): void {
    const key = this.getTokenKey(token);

    this.awilixContainer.register({
      [key]: asClass(classConstructor, {
        lifetime: this.mapLifetime(options?.lifetime),
        injector: () => options?.localInjections ?? {}
      })
    });
  }

  registerValue<T>(token: string | symbol, value: T) {
    this.awilixContainer.register({
      [this.getTokenKey(token)]: asValue(value)
    });
  }

  registerFunction<T>(token: string | symbol, func: () => T, options?: RegistrationOptions) {
    this.awilixContainer.register({
      [this.getTokenKey(token)]: asFunction(func, {
        lifetime: this.mapLifetime(options?.lifetime)
      })
    });
  }

  async dispose(): Promise<void> {
    await this.awilixContainer.dispose();
  }

  createScope(): Container {
    return new AwilixContainerAdapter({ awilixContainer: this.awilixContainer.createScope() });
  }

  private mapLifetime(lifetime?: DependencyLifetime) {
    switch (lifetime) {
      case DependencyLifetime.SCOPED:
        return 'SCOPED';
      case DependencyLifetime.SINGLETON:
        return 'SINGLETON';
      case DependencyLifetime.TRANSIENT:
        return 'TRANSIENT';
      default:
        return 'TRANSIENT';
    }
  }

  private getTokenKey(token: string | symbol): string {
    if (typeof token === 'symbol') {
      if (!this.symbolMap.has(token)) {
        this.symbolMap.set(token, `__symbol_${Symbol.keyFor(token) || this.symbolMap.size}`);
      }
      return this.symbolMap.get(token)!;
    }
    return token;
  }
}
