import { AwilixContainerAdapter } from '../di/AwilixContainerAdapter.js';
import { AwilixContainer, createContainer, InjectionMode } from 'awilix';
import { DecoratorMissingError } from '../errors/DecoratorMissingError.js';
import { ConfigurationManager } from '../configuration/ConfigurationManager.js';
import { YamlConfigurationSource } from '../configuration/YamlConfigurationSource.js';
import { AppMetadata } from '../metadata/registry.js';
import { Metadata } from '../metadata/Metadata.js';
import { MetadataKeys } from '../metadata/keys.js';
import { MetadataRegistry } from '../metadata/MetadataRegistry.js';
import { ConfigurationProvider } from '../configuration/ConfigurationProvider.js';
import { InMemoryCommandBus } from '../cqrs/command/InMemoryCommandBus.js';
import { DependencyLifetime } from '../di/DependencyLifetime.js';

export class StratixApplication {
  public config?: ConfigurationProvider;
  public readonly registry: MetadataRegistry;
  public readonly metadata: AppMetadata;

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
    this.appClass = appClass;
    this.registry = registry ?? new MetadataRegistry({ appClass });

    // Get metadata (type-safe, guaranteed by registry construction)
    this.metadata = Metadata.getOrThrow(appClass, MetadataKeys.App);

    // Create DI container with settings from metadata
    this.awilixContainer = createContainer({
      strict: this.metadata.di.strict,
      injectionMode: InjectionMode.PROXY
    });

    this.container = new AwilixContainerAdapter({
      awilixContainer: this.awilixContainer
    });
  }

  async initialize(): Promise<void> {
    const appMetadata = this.metadata;
    if (!appMetadata) {
      throw new DecoratorMissingError('@StratixApp', this.appClass.name);
    }
    this.registerBuses();
    this.registerCommandHandlers();
    await this.registerConfiguration();
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
      this.container.registerClass(commandClass.name, handlerClass, {
        lifetime: DependencyLifetime.TRANSIENT
      });
      this.container.registerClass(handlerClass.name, handlerClass, {
        lifetime: DependencyLifetime.TRANSIENT
      });
    }
  }

  async registerConfiguration(): Promise<void> {
    const appMetadata = this.metadata;
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
    await this.config.load();
  }

  async shutdown(): Promise<void> {
    // Dispose DI container
    await this.container.dispose();
  }

  resolve<T>(token: string | symbol): T {
    return this.container.resolve<T>(token);
  }
}
