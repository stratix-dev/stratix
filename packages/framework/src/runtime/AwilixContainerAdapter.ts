import { AwilixContainer, asFunction, asValue, asClass } from 'awilix';
import { Container, DependencyLifetime, RegistrationOptions } from '@stratix/core';

export class AwilixContainerAdapter implements Container {
  private readonly symbolMap = new Map<symbol, string>();

  constructor(private readonly awilix: AwilixContainer) {}

  resolve<T>(token: string | symbol): T {
    const key = this.getTokenKey(token);
    return this.awilix.resolve<T>(key);
  }

  registerClass<T>(
    token: string | symbol,
    classConstructor: { new (...args: any[]): T },
    options?: RegistrationOptions
  ) {
    this.awilix.register({
      [this.getTokenKey(token)]: asClass(classConstructor, {
        lifetime: options?.lifetime
      })
    });
  }

  registerValue<T>(token: string | symbol, value: T) {
    this.awilix.register({
      [this.getTokenKey(token)]: asValue(value)
    });
  }

  registerFunction<T>(token: string | symbol, func: () => T, options?: RegistrationOptions) {
    this.awilix.register({
      [this.getTokenKey(token)]: asFunction(func, {
        lifetime: this.mapLifetime(options?.lifetime)
      })
    });
  }

  async dispose(): Promise<void> {
    await this.awilix.dispose();
  }

  createScope(): Container {
    return new AwilixContainerAdapter(this.awilix.createScope());
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
