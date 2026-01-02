
import type { Logger } from '@stratix/core';
import { createContainer, asClass, asValue, Lifetime } from 'awilix';
import type { AwilixContainer } from 'awilix';
import { MetadataStorage } from '../runtime/MetadataStorage.js';
import { StratixApplication } from '../runtime/StratixApplication.js';
import { LifecycleOrchestrator } from '../runtime/LifecycleOrchestrator.js';
import { InMemoryCommandBus } from '../messaging/InMemoryCommandBus.js';
import { InMemoryQueryBus } from '../messaging/InMemoryQueryBus.js';
import { InMemoryEventBus } from '../messaging/InMemoryEventBus.js';
import { ConsoleLogger } from '../infrastructure/ConsoleLogger.js';

/**
 * Options for bootstrapping the application.
 */
export interface BootstrapOptions {
  /**
   * Custom logger instance (optional).
   * If not provided, ConsoleLogger is used.
   */
  logger?: Logger;

  /**
   * Port for HTTP server (optional).
   * Only used if an HTTP plugin is registered.
   */
  port?: number;

  /**
   * Enable graceful shutdown handling.
   * @default true
   */
  gracefulShutdown?: boolean;
}

/**
 * Bootstraps a Stratix application.
 *
 * This function:
 * 1. Creates the DI container (Awilix)
 * 2. Registers core services (logger, buses)
 * 3. Loads all modules
 * 4. Auto-discovers and registers all handlers
 * 5. Initializes and starts the application
 *
 * @param appClass - The application class decorated with @StratixApp
 * @param options - Bootstrap options
 * @returns The running StratixApplication instance
 *
 * @example
 * ```typescript
 * @StratixApp({ modules: [UserModule] })
 * export class App {}
 *
 * await bootstrap(App);
 * ```
 *
 * @category Bootstrap
 */
export async function bootstrap(
  appClass: { new (...args: any[]): any },
  options: BootstrapOptions = {}
): Promise<StratixApplication> {
  const {
    logger = new ConsoleLogger(),
    gracefulShutdown = true,
  } = options;

  // Get app metadata
  const appMetadata = MetadataStorage.getApp(appClass);
  if (!appMetadata) {
    throw new Error(
      `${appClass.name} is not decorated with @StratixApp. Add @StratixApp({ modules: [...] }) to your app class.`
    );
  }

  logger.info(`Bootstrapping ${appClass.name}...`);

  // Create DI container
  const container = createContainer();

  // Register core services
  container.register({
    logger: asValue(logger),
    commandBus: asClass(InMemoryCommandBus).singleton(),
    queryBus: asClass(InMemoryQueryBus).singleton(),
    eventBus: asClass(InMemoryEventBus).singleton(),
  });

  logger.info('Core services registered');

  // Create lifecycle orchestrator
  const lifecycleOrchestrator = new LifecycleOrchestrator(logger);

  // Load and instantiate plugins
  for (const pluginClass of appMetadata.plugins) {
    const pluginMetadata = MetadataStorage.getPlugin(pluginClass);
    if (pluginMetadata) {
      logger.info(`Loading plugin: ${pluginMetadata.name}`);
      const pluginInstance = new pluginClass();
      lifecycleOrchestrator.registerPlugin(pluginInstance);

      // Register plugin in container by name
      container.register({
        [`plugin_${pluginMetadata.name}`]: asValue(pluginInstance),
      });
    }
  }

  // Load modules
  for (const moduleClass of appMetadata.modules) {
    const moduleInstance = await loadModule(moduleClass, container, logger);
    lifecycleOrchestrator.registerModule(moduleInstance);
  }

  // Auto-register command handlers
  const commandHandlers = MetadataStorage.getAllCommandHandlers();
  const commandBus = container.resolve<InMemoryCommandBus>('commandBus');

  for (const handlerMetadata of commandHandlers) {
    // Register handler in container
    const handlerToken = handlerMetadata.handlerClass.name;
    container.register({
      [handlerToken]: asClass(handlerMetadata.handlerClass).scoped(),
    });

    // Register handler in command bus
    commandBus.register(
      handlerMetadata.commandClass,
      container.resolve(handlerToken)
    );

    logger.info(
      `Registered command handler: ${handlerMetadata.commandClass.name} -> ${handlerMetadata.handlerClass.name}`
    );
  }

  // Auto-register query handlers
  const queryHandlers = MetadataStorage.getAllQueryHandlers();
  const queryBus = container.resolve<InMemoryQueryBus>('queryBus');

  for (const handlerMetadata of queryHandlers) {
    // Register handler in container
    const handlerToken = handlerMetadata.handlerClass.name;
    container.register({
      [handlerToken]: asClass(handlerMetadata.handlerClass).scoped(),
    });

    // Register handler in query bus
    queryBus.register(
      handlerMetadata.queryClass,
      container.resolve(handlerToken)
    );

    logger.info(
      `Registered query handler: ${handlerMetadata.queryClass.name} -> ${handlerMetadata.handlerClass.name}`
    );
  }

  // Auto-register event handlers
  const eventHandlers = MetadataStorage.getAllEventHandlers();
  const eventBus = container.resolve<InMemoryEventBus>('eventBus');

  for (const handlerMetadata of eventHandlers) {
    // Register handler in container
    const handlerToken = handlerMetadata.handlerClass.name;
    container.register({
      [handlerToken]: asClass(handlerMetadata.handlerClass).scoped(),
    });

    const handlerInstance = container.resolve(handlerToken);

    // Subscribe to all events this handler listens to
    for (const [eventName, methodName] of handlerMetadata.eventMethods.entries()) {
      (eventBus as any).subscribeByName(eventName, {
        handle: async (event: any) => {
          await handlerInstance[methodName](event);
        },
      });

      logger.info(
        `Registered event handler: ${eventName} -> ${handlerMetadata.handlerClass.name}.${methodName}()`
      );
    }
  }

  // Create application instance with lifecycle orchestrator
  const app = new StratixApplication(container, logger, lifecycleOrchestrator);

  // Setup graceful shutdown
  if (gracefulShutdown) {
    setupGracefulShutdown(app, logger);
  }

  // Start application
  await app.start();

  logger.info(`${appClass.name} is running`);

  return app;
}

/**
 * Loads a module and registers its providers.
 * Returns the module instance for lifecycle management.
 */
async function loadModule(
  moduleClass: { new (...args: any[]): any },
  container: AwilixContainer,
  logger: Logger
): Promise<any> {
  const moduleMetadata = MetadataStorage.getModule(moduleClass);

  if (!moduleMetadata) {
    throw new Error(
      `${moduleClass.name} is not decorated with @Module. Add @Module({ providers: [...] }) to your module class.`
    );
  }

  logger.info(`Loading module: ${moduleClass.name}`);

  // Load imported modules first
  for (const importedModule of moduleMetadata.imports) {
    await loadModule(importedModule, container, logger);
  }

  // Register providers
  for (const provider of moduleMetadata.providers) {
    if (typeof provider === 'function') {
      // Class provider (shorthand)
      const token = provider.name;
      container.register({
        [token]: asClass(provider).scoped(),
      });
      logger.info(`  Registered provider: ${token}`);
    } else if ('useClass' in provider) {
      // useClass provider
      const token =
        typeof provider.provide === 'string' || typeof provider.provide === 'symbol'
          ? provider.provide
          : provider.provide.name;
      container.register({
        [token]: asClass(provider.useClass).scoped(),
      });
      logger.info(`  Registered provider: ${String(token)} -> ${provider.useClass.name}`);
    } else if ('useValue' in provider) {
      // useValue provider
      const token =
        typeof provider.provide === 'string' || typeof provider.provide === 'symbol'
          ? provider.provide
          : provider.provide.name;
      container.register({
        [token]: asValue(provider.useValue),
      });
      logger.info(`  Registered provider: ${String(token)} (value)`);
    } else if ('useFactory' in provider) {
      // useFactory provider
      const token =
        typeof provider.provide === 'string' || typeof provider.provide === 'symbol'
          ? provider.provide
          : provider.provide.name;
      container.register({
        [token]: {
          resolve: () => provider.useFactory(container),
          lifetime: Lifetime.SCOPED,
        },
      });
      logger.info(`  Registered provider: ${String(token)} (factory)`);
    }
  }

  // Create and return module instance for lifecycle management
  const moduleInstance = new moduleClass();

  // Register module instance in container
  container.register({
    [`module_${moduleClass.name}`]: asValue(moduleInstance),
  });

  return moduleInstance;
}

/**
 * Sets up graceful shutdown handlers.
 */
function setupGracefulShutdown(app: StratixApplication, logger: Logger): void {
  const shutdown = async () => {
    logger.info('Received shutdown signal, closing gracefully...');
    await app.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
