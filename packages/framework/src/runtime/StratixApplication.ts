import { ConfigurationProvider } from '@stratix/core';
import { AwilixContainerAdapter } from '../di/AwilixContainerAdapter.js';
import { AwilixContainer, createContainer } from 'awilix';
import { MetadataStorage } from './MetadataStorage.js';
import { StratixError } from '../errors/StratixError.js';
import { Error } from '../errors/Error.js';

export class StratixApplication {
  public readonly container: AwilixContainerAdapter;
  public readonly config: ConfigurationProvider;

  private readonly appClass: new (...args: any[]) => any;
  private readonly awilixContainer: AwilixContainer;

  constructor(appClass: new (...args: any[]) => any) {
    this.appClass = appClass;
    this.awilixContainer = createContainer({ strict: true });
    this.container = new AwilixContainerAdapter(this.awilixContainer);
    this.config = null as any; // To be initialized later
  }

  async initialize(): Promise<void> {
    const metadata = MetadataStorage.getAppMetadata(this.appClass);

    if (!metadata) {
      throw new StratixError(Error.RUNTIME_ERROR, 'Application metadata not found');
    }
  }

  async shutdown(): Promise<void> {
    // Dispose DI container
    await this.container.dispose();
  }

  resolve<T>(token: string | symbol): T {
    return this.container.resolve<T>(token);
  }
}
