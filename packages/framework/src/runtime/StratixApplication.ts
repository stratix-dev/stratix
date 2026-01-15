import { CommandBus, ConfigurationProvider, DependencyLifetime } from '@stratix/core';
import { AwilixContainerAdapter } from '../di/AwilixContainerAdapter.js';
import { AwilixContainer, createContainer, InjectionMode } from 'awilix';
import { MetadataReader } from '../metadata/MetadataReader.js';
import { MetadataRegistry } from './MetadataRegistry.js';
import { InMemoryCommandBus, InMemoryCommandBusOptions } from '../cqrs/InMemoryCommandBus.js';
import { DecoratorMissingError } from '../errors/DecoratorMissingError.js';
import {
  ConfigurationManager,
  ConfigurationManagerOptions
} from '../configuration/ConfigurationManager.js';
import {
  YamlConfigurationSource,
  YamlSourceOptions
} from '../configuration/YamlConfigurationSource.js';

export class StratixApplication {
  public config: ConfigurationProvider;
  public readonly registry: MetadataRegistry;

  private readonly appClass: new (...args: any[]) => any;
  private readonly awilixContainer: AwilixContainer;
  private readonly container: AwilixContainerAdapter;

  constructor(appClass: new (...args: any[]) => any, registry?: MetadataRegistry) {
    if (!registry) {
      registry = new MetadataRegistry(appClass);
    }
    this.appClass = appClass;
    this.registry = registry;

    this.awilixContainer = createContainer({ strict: true, injectionMode: InjectionMode.CLASSIC });
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
    this.registerConfiguration();
  }

  registerBuses(): void {
    this.container.registerValue<InMemoryCommandBusOptions>('inMemoryCommandBusOptions', {
      container: this.container,
      registry: this.registry
    });
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

    this.container.registerValue<YamlSourceOptions>('yamlSourceOptions', {
      filePath: appMetadata.configuration.configFile
    });

    this.container.registerClass<YamlConfigurationSource>(
      'yamlConfigurationSource',
      YamlConfigurationSource,
      {
        lifetime: DependencyLifetime.SINGLETON
      }
    );

    this.container.registerValue<ConfigurationManagerOptions>('configurationManagerOptions', {
      sources: [this.container.resolve<YamlConfigurationSource>('yamlConfigurationSource')],
      cache: false
    });

    this.container.registerClass<ConfigurationProvider>('config', ConfigurationManager, {
      lifetime: DependencyLifetime.SINGLETON
    });

    this.config = this.container.resolve<ConfigurationProvider>('config');
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
