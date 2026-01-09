import {
  ConfigurationProvider,
  ConfigurationSource,
  DependencyLifetime,
  Logger,
  LoggerConfig
} from '@stratix/core';
import { InMemoryCommandBus } from '../messaging/InMemoryCommandBus.js';
import { InMemoryEventBus } from '../messaging/InMemoryEventBus.js';
import { InMemoryQueryBus } from '../messaging/InMemoryQueryBus.js';
import { CORE_TOKENS } from '../tokens/CoreTokens.js';
import { LoggerBuilder } from '../logging/LoggerBuilder.js';
import { LoggerFactory } from '../logging/LoggerFactory.js';
import { StratixAppOptions } from '../docorators/StratixApp.js';
import { AwilixContainerAdapter } from './AwilixContainerAdapter.js';
import { AwilixContainer, createContainer } from 'awilix';
import { MetadataStorage } from './MetadataStorage.js';
import { StratixError } from '../errors/StratixError.js';
import { Error } from '../errors/Error.js';
import { YamlConfigurationSource } from '../configuration/YamlConfigurationSource.js';
import { EnvironmentConfigurationSource } from '../configuration/EnvironmentConfigurationSource.js';
import { ConfigurationManager } from '../configuration/ConfigurationManager.js';

export class StratixApplication {
  public readonly container: AwilixContainerAdapter;
  private readonly awilixContainer: AwilixContainer;
  private readonly appClass: any;
  public readonly config: ConfigurationProvider;
  private loggerFactory?: LoggerFactory;

  constructor(appClass: new (...args: any[]) => any) {
    this.appClass = appClass;
    this.awilixContainer = createContainer();
    this.container = new AwilixContainerAdapter(this.awilixContainer);
    this.config = null as any; // To be initialized later
  }

  async initialize(): Promise<void> {
    const metadata = MetadataStorage.getAppMetadata(this.appClass);

    if (!metadata) {
      throw new StratixError(Error.RUNTIME_ERROR, 'Application metadata not found');
    }

    // Register services in order
    await this.initializeConfiguration(metadata);
    await this.registerLogger(metadata);
    this.registerBuses();
  }

  async shutdown(): Promise<void> {
    // Close logger transports
    if (this.loggerFactory) {
      await this.loggerFactory.close();
    }

    // Dispose DI container
    await this.container.dispose();
  }

  resolve<T>(token: string | symbol): T {
    return this.container.resolve<T>(token);
  }

  private async initializeConfiguration(metadata: StratixAppOptions): Promise<void> {
    const configOptions = metadata.configuration;

    // Build sources list
    const sources: ConfigurationSource[] = [];

    // 1. Custom sources (if provided)
    if (configOptions?.sources) {
      sources.push(...configOptions.sources);
    }
    // 2. Default YAML file
    else if (configOptions?.configFile !== undefined) {
      const configFile = configOptions.configFile;
      sources.push(new YamlConfigurationSource({ filePath: configFile }));
    }

    // O usar el valor por defecto si no está definido
    else {
      sources.push(new YamlConfigurationSource({ filePath: './config/app.yml' }));
    }

    // 3. Environment variables (always last, highest priority)
    const envPrefix = configOptions?.envPrefix ?? 'APP_';
    sources.push(new EnvironmentConfigurationSource({ prefix: envPrefix }));

    // Create and load configuration
    const configManager = new ConfigurationManager({ sources });
    await configManager.load();

    // Store in instance and DI container
    (this as any).config = configManager;
    this.container.registerValue(CORE_TOKENS.CONFIGURATION, configManager);
  }

  private async registerLogger(metadata: StratixAppOptions): Promise<void> {
    const loggerOption = metadata.services?.logger;

    // Case 1: logger: false (disabled)
    if (loggerOption === false) {
      //this.container.registerValue(CORE_TOKENS.LOGGER, new NoopLogger());
      return;
    }

    // Case 2: LoggerFactory provided
    if (loggerOption instanceof LoggerFactory) {
      this.loggerFactory = loggerOption;
      this.container.registerValue(CORE_TOKENS.LOGGER_FACTORY, loggerOption);
      this.container.registerFunction(CORE_TOKENS.LOGGER, () => loggerOption.create(), {
        lifetime: DependencyLifetime.SINGLETON
      });
      return;
    }

    // Case 3: Logger instance provided
    if (this.isLogger(loggerOption)) {
      this.container.registerValue(CORE_TOKENS.LOGGER, loggerOption);
      return;
    }

    // Case 4: LoggerConfig provided
    if (
      loggerOption &&
      typeof loggerOption === 'object' &&
      !(loggerOption instanceof LoggerFactory) &&
      !this.isLogger(loggerOption)
    ) {
      this.loggerFactory = new LoggerFactory(loggerOption as LoggerConfig);
      this.container.registerValue(CORE_TOKENS.LOGGER_FACTORY, this.loggerFactory);
      this.container.registerFunction(CORE_TOKENS.LOGGER, () => this.loggerFactory!.create(), {
        lifetime: DependencyLifetime.SINGLETON
      });
      return;
    }

    // Case 5: Default (no config)
    const isDev = metadata.behavior?.developmentMode ?? process.env.NODE_ENV !== 'production';

    this.loggerFactory = isDev ? LoggerBuilder.development() : LoggerBuilder.production();

    this.container.registerValue(CORE_TOKENS.LOGGER_FACTORY, this.loggerFactory);
    this.container.registerFunction(CORE_TOKENS.LOGGER, () => this.loggerFactory!.create(), {
      lifetime: DependencyLifetime.SINGLETON
    });
  }

  private registerBuses(): void {
    this.container.registerClass(CORE_TOKENS.COMMAND_BUS, InMemoryCommandBus);
    this.container.registerClass(CORE_TOKENS.QUERY_BUS, InMemoryQueryBus);
    this.container.registerClass(CORE_TOKENS.EVENT_BUS, InMemoryEventBus);
  }

  private isLogger(obj: any): obj is Logger {
    return (
      obj &&
      typeof obj.debug === 'function' &&
      typeof obj.info === 'function' &&
      typeof obj.warn === 'function' &&
      typeof obj.error === 'function' &&
      typeof obj.fatal === 'function'
    );
  }
}
