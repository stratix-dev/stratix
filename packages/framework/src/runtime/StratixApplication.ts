import { ConfigurationProvider } from '@stratix/core';
import { AwilixContainerAdapter } from '../di/AwilixContainerAdapter.js';
import { AwilixContainer, createContainer } from 'awilix';
import { StratixError } from '../errors/StratixError.js';
import { Error } from '../errors/Error.js';
import { MetadataReader } from '../metadata/MetadataReader.js';
import { MetadataRegistry } from './MetadataRegistry.js';

export class StratixApplication {
  public readonly container: AwilixContainerAdapter;
  public readonly config: ConfigurationProvider;
  public readonly registry: MetadataRegistry;

  private readonly appClass: new (...args: any[]) => any;
  private readonly awilixContainer: AwilixContainer;

  constructor(appClass: new (...args: any[]) => any, registry?: MetadataRegistry) {
    this.appClass = appClass;
    this.registry = registry || MetadataRegistry.buildFromApp(appClass);

    this.awilixContainer = createContainer({ strict: true });
    this.container = new AwilixContainerAdapter(this.awilixContainer);
    this.config = null as any; // To be initialized later
  }

  async initialize(): Promise<void> {
    const appMetadata = MetadataReader.getAppMetadata(this.appClass);
    if (!appMetadata) {
      throw new StratixError(
        Error.RUNTIME_ERROR,
        'The provided application class is not decorated with @StratixApp'
      );
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
