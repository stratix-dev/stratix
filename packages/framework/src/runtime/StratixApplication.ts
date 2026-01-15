import { ConfigurationProvider, DependencyLifetime } from '@stratix/core';
import { AwilixContainerAdapter } from '../di/AwilixContainerAdapter.js';
import { AwilixContainer, createContainer, InjectionMode } from 'awilix';
import { MetadataReader } from '../metadata/MetadataReader.js';
import { MetadataRegistry } from './MetadataRegistry.js';
import { InMemoryCommandBus } from '../cqrs/InMemoryCommandBus.js';
import { DecoratorMissingError } from '../errors/DecoratorMissingError.js';
import { ConfigurationManager } from '../configuration/ConfigurationManager.js';
import { YamlConfigurationSource } from '../configuration/YamlConfigurationSource.js';

export class StratixApplication {
  public config: ConfigurationProvider;
  public readonly registry: MetadataRegistry;

  private readonly appClass: new (...args: any[]) => any;
  private readonly awilixContainer: AwilixContainer;
  private readonly container: AwilixContainerAdapter;

  constructor({
    appClass,
    registry
  }: {
    appClass: new (...args: any[]) => any;
    registry?: MetadataRegistry;
  }) {
    if (!registry) {
      registry = new MetadataRegistry({ appClass });
    }
    this.appClass = appClass;
    this.registry = registry;
    this.awilixContainer = createContainer({ strict: true, injectionMode: InjectionMode.PROXY });
    this.container = new AwilixContainerAdapter({ awilixContainer: this.awilixContainer });
    this.config = null as any; // To be initialized later
  }

  async initialize(): Promise<void> {
    const appMetadata = MetadataReader.getAppMetadata(this.appClass);
    if (!appMetadata) {
      throw new DecoratorMissingError('@StratixApp', this.appClass.name);
    }
    this.registerBuses();
    this.registerCommandHandlers();
    this.registerConfiguration();
  }

  registerBuses(): void {
    this.container.registerClass('commandBus', InMemoryCommandBus, {
      lifetime: DependencyLifetime.SINGLETON,
      localInjections: {
        container: this.container,
        registry: this.registry
      }
    });
  }

  registerCommandHandlers(): void {
    const commandHandlerMetadatas = this.registry.handlerToCommand.entries();
    for (const [handlerClass, commandClass] of commandHandlerMetadatas) {
      this.container.registerClass(commandClass.name, commandClass, {
        lifetime: DependencyLifetime.TRANSIENT
      });
      this.container.registerClass(handlerClass.name, handlerClass, {
        lifetime: DependencyLifetime.TRANSIENT
      });
    }
  }

  registerConfiguration(): void {
    const appMetadata = MetadataReader.getAppMetadata(this.appClass);
    if (!appMetadata?.configuration) {
      return;
    }

    this.container.registerClass('yamlConfigurationSource', YamlConfigurationSource, {
      lifetime: DependencyLifetime.SINGLETON,
      localInjections: {
        filePath: appMetadata.configuration.configFile,
        basePath: process.cwd(),
        encoding: 'utf-8'
      }
    });

    this.container.registerClass('config', ConfigurationManager, {
      lifetime: DependencyLifetime.SINGLETON,
      localInjections: {
        sources: [this.container.resolve('yamlConfigurationSource')],
        cache: false
      }
    });

    this.config = this.container.resolve('config');
    this.config.load();
  }

  async shutdown(): Promise<void> {
    // Dispose DI container
    await this.container.dispose();
  }

  resolve<T>(token: string | symbol): T {
    return this.container.resolve<T>(token);
  }
}
