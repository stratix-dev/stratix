import { CommandBus, ConfigurationProvider, DependencyLifetime } from '@stratix/core';
import { AwilixContainerAdapter } from '../di/AwilixContainerAdapter.js';
import { AwilixContainer, createContainer } from 'awilix';
import { MetadataReader } from '../metadata/MetadataReader.js';
import { MetadataRegistry } from './MetadataRegistry.js';
import { InMemoryCommandBus } from '../cqrs/InMemoryCommandBus.js';
import { DecoratorMissingError } from '../errors/DecoratorMissingError.js';

export class StratixApplication {
  public readonly container: AwilixContainerAdapter;
  public readonly config: ConfigurationProvider;
  public readonly registry: MetadataRegistry;

  private readonly appClass: new (...args: any[]) => any;
  private readonly awilixContainer: AwilixContainer;

  constructor(appClass: new (...args: any[]) => any, registry?: MetadataRegistry) {
    this.appClass = appClass;
    this.registry = registry || new MetadataRegistry(appClass);

    this.awilixContainer = createContainer({ strict: true });
    this.container = new AwilixContainerAdapter(this.awilixContainer);
    this.config = null as any; // To be initialized later
  }

  async initialize(): Promise<void> {
    const appMetadata = MetadataReader.getAppMetadata(this.appClass);
    if (!appMetadata) {
      throw new DecoratorMissingError('@StratixApp', this.appClass.name);
    }
    this.registerBuses();
    this.registerCommandHandlers();
  }

  registerBuses(): void {
    this.container.registerClass<CommandBus>('commandBus', InMemoryCommandBus, {
      lifetime: DependencyLifetime.SINGLETON
    });
  }

  registerCommandHandlers(): void {
    const commandHandlerMetadatas = this.registry.handlerToCommand.entries();
    for (const [handlerClass, commandClass] of commandHandlerMetadatas) {
      this.container.registerClass(commandClass.name, commandClass, {
        lifetime: DependencyLifetime.TRANSIENT
      });
      this.container.registerClass(handlerClass.name, handlerClass as new (...args: any[]) => any, {
        lifetime: DependencyLifetime.TRANSIENT
      });
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
