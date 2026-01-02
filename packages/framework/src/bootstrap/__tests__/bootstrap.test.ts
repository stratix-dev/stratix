import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrap } from '../bootstrap.js';
import { StratixApp } from '../../decorators/core/StratixApp.js';
import { Plugin } from '../../decorators/core/Plugin.js';
import { Module } from '../../decorators/application/Module.js';
import { Command } from '../../decorators/application/Command.js';
import { CommandHandler } from '../../decorators/application/CommandHandler.js';
import type {
  OnModuleInit,
  OnModuleStart,
  OnPluginInit,
  OnPluginStart,
} from '../../lifecycle/interfaces.js';
import { MetadataStorage } from '../../runtime/MetadataStorage.js';

describe('bootstrap', () => {
  beforeEach(() => {
    // Clear all metadata
    MetadataStorage['apps'] = new Map();
    MetadataStorage['modules'] = new Map();
    MetadataStorage['plugins'] = new Map();
    MetadataStorage['commands'] = new Map();
    MetadataStorage['commandHandlers'] = new Map();
    MetadataStorage['queries'] = new Map();
    MetadataStorage['queryHandlers'] = new Map();
    MetadataStorage['eventHandlers'] = new Map();
  });

  describe('Basic Bootstrap', () => {
    it('should bootstrap a simple application', async () => {
      @Module({})
      class TestModule {}

      @StratixApp({
        modules: [TestModule],
        plugins: [],
      })
      class App {}

      const app = await bootstrap(App);

      expect(app).toBeDefined();
      expect(app.getContainer()).toBeDefined();
    });

    it('should throw error if app is not decorated with @StratixApp', async () => {
      class App {}

      await expect(bootstrap(App)).rejects.toThrow(
        'is not decorated with @StratixApp'
      );
    });
  });

  describe('Core Services Registration', () => {
    it('should register core services in container', async () => {
      @Module({})
      class TestModule {}

      @StratixApp({ modules: [TestModule] })
      class App {}

      const app = await bootstrap(App);
      const container = app.getContainer();

      expect(container.resolve('logger')).toBeDefined();
      expect(container.resolve('commandBus')).toBeDefined();
      expect(container.resolve('queryBus')).toBeDefined();
      expect(container.resolve('eventBus')).toBeDefined();
    });
  });

  describe('Module Loading', () => {
    it('should load and register modules', async () => {
      @Module({})
      class TestModule {}

      @StratixApp({ modules: [TestModule] })
      class App {}

      const app = await bootstrap(App);
      const container = app.getContainer();

      // Module should be registered in container
      expect(container.resolve('module_TestModule')).toBeDefined();
    });

    it('should load modules with providers', async () => {
      class TestService {
        getValue(): string {
          return 'test';
        }
      }

      @Module({
        providers: [TestService],
      })
      class TestModule {}

      @StratixApp({ modules: [TestModule] })
      class App {}

      const app = await bootstrap(App);
      const container = app.getContainer();

      const service = container.resolve<TestService>('TestService');
      expect(service).toBeDefined();
      expect(service.getValue()).toBe('test');
    });

    it('should execute module lifecycle hooks', async () => {
      const initSpy = vi.fn();
      const startSpy = vi.fn();

      @Module({})
      class TestModule implements OnModuleInit, OnModuleStart {
        onModuleInit = initSpy;
        onModuleStart = startSpy;
      }

      @StratixApp({ modules: [TestModule] })
      class App {}

      await bootstrap(App);

      expect(initSpy).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('Plugin Loading', () => {
    it('should load and register plugins', async () => {
      @Plugin({
        name: 'test-plugin',
        description: 'Test plugin',
        version: '1.0.0',
      })
      class TestPlugin {}

      @Module({})
      class TestModule {}

      @StratixApp({
        modules: [TestModule],
        plugins: [TestPlugin],
      })
      class App {}

      const app = await bootstrap(App);
      const container = app.getContainer();

      // Plugin should be registered in container
      expect(container.resolve('plugin_test-plugin')).toBeDefined();
    });

    it('should execute plugin lifecycle hooks', async () => {
      const initSpy = vi.fn();
      const startSpy = vi.fn();

      @Plugin({
        name: 'test-plugin',
        description: 'Test plugin',
        version: '1.0.0',
      })
      class TestPlugin implements OnPluginInit, OnPluginStart {
        onPluginInit = initSpy;
        onPluginStart = startSpy;
      }

      @Module({})
      class TestModule {}

      @StratixApp({
        modules: [TestModule],
        plugins: [TestPlugin],
      })
      class App {}

      await bootstrap(App);

      expect(initSpy).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalled();
    });

    it('should initialize plugins before modules', async () => {
      const callOrder: string[] = [];

      @Plugin({
        name: 'test-plugin',
        description: 'Test plugin',
        version: '1.0.0',
      })
      class TestPlugin implements OnPluginInit {
        async onPluginInit(): Promise<void> {
          callOrder.push('plugin');
        }
      }

      @Module({})
      class TestModule implements OnModuleInit {
        async onModuleInit(): Promise<void> {
          callOrder.push('module');
        }
      }

      @StratixApp({
        modules: [TestModule],
        plugins: [TestPlugin],
      })
      class App {}

      await bootstrap(App);

      expect(callOrder).toEqual(['plugin', 'module']);
    });
  });

  describe('Command Handler Registration', () => {
    it('should auto-register command handlers', async () => {
      @Command()
      class TestCommand {
        constructor(public readonly value: string) {}
      }

      @CommandHandler(TestCommand)
      class TestCommandHandler {
        async execute(command: TestCommand): Promise<string> {
          return `Handled: ${command.value}`;
        }
      }

      @Module({})
      class TestModule {}

      @StratixApp({ modules: [TestModule] })
      class App {}

      const app = await bootstrap(App);
      const commandBus = app.resolve<any>('commandBus');

      const result = await commandBus.dispatch(new TestCommand('test'));
      expect(result).toBe('Handled: test');
    });
  });

  describe('Application Lifecycle', () => {
    it('should execute complete lifecycle during bootstrap', async () => {
      const callOrder: string[] = [];

      @Plugin({
        name: 'test-plugin',
        description: 'Test plugin',
        version: '1.0.0',
      })
      class TestPlugin implements OnPluginInit, OnPluginStart {
        async onPluginInit(): Promise<void> {
          callOrder.push('plugin-init');
        }
        async onPluginStart(): Promise<void> {
          callOrder.push('plugin-start');
        }
      }

      @Module({})
      class TestModule implements OnModuleInit, OnModuleStart {
        async onModuleInit(): Promise<void> {
          callOrder.push('module-init');
        }
        async onModuleStart(): Promise<void> {
          callOrder.push('module-start');
        }
      }

      @StratixApp({
        modules: [TestModule],
        plugins: [TestPlugin],
      })
      class App {}

      await bootstrap(App);

      expect(callOrder).toEqual([
        'plugin-init',
        'module-init',
        'plugin-start',
        'module-start',
      ]);
    });

    it('should stop gracefully', async () => {
      @Module({})
      class TestModule {}

      @StratixApp({ modules: [TestModule] })
      class App {}

      const app = await bootstrap(App);

      await expect(app.stop()).resolves.not.toThrow();
    });
  });

  describe('Custom Options', () => {
    it('should accept custom logger', async () => {
      const customLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      };

      @Module({})
      class TestModule {}

      @StratixApp({ modules: [TestModule] })
      class App {}

      const app = await bootstrap(App, { logger: customLogger });

      expect(customLogger.info).toHaveBeenCalled();

      const resolvedLogger = app.resolve('logger');
      expect(resolvedLogger).toBe(customLogger);
    });

    it('should support disabling graceful shutdown', async () => {
      @Module({})
      class TestModule {}

      @StratixApp({ modules: [TestModule] })
      class App {}

      const app = await bootstrap(App, { gracefulShutdown: false });

      expect(app).toBeDefined();
    });
  });

  describe('Complex Application', () => {
    it('should bootstrap application with multiple modules and plugins', async () => {
      @Plugin({
        name: 'plugin1',
        description: 'Plugin 1',
        version: '1.0.0',
      })
      class Plugin1 {}

      @Plugin({
        name: 'plugin2',
        description: 'Plugin 2',
        version: '1.0.0',
      })
      class Plugin2 {}

      class Service1 {
        getName() {
          return 'service1';
        }
      }

      class Service2 {
        getName() {
          return 'service2';
        }
      }

      @Module({
        providers: [Service1],
      })
      class Module1 {}

      @Module({
        providers: [Service2],
      })
      class Module2 {}

      @StratixApp({
        modules: [Module1, Module2],
        plugins: [Plugin1, Plugin2],
      })
      class App {}

      const app = await bootstrap(App);
      const container = app.getContainer();

      expect(container.resolve('plugin_plugin1')).toBeDefined();
      expect(container.resolve('plugin_plugin2')).toBeDefined();
      expect(container.resolve('module_Module1')).toBeDefined();
      expect(container.resolve('module_Module2')).toBeDefined();
      expect(container.resolve<Service1>('Service1').getName()).toBe(
        'service1'
      );
      expect(container.resolve<Service2>('Service2').getName()).toBe(
        'service2'
      );
    });
  });
});
