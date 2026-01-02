import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LifecycleOrchestrator } from '../LifecycleOrchestrator.js';
import type { Logger } from '@stratix/core';
import type {
  OnModuleInit,
  OnModuleStart,
  OnModuleStop,
  OnPluginInit,
  OnPluginStart,
  OnPluginStop,
  OnApplicationReady,
  OnApplicationShutdown,
} from '../../lifecycle/interfaces.js';

describe('LifecycleOrchestrator', () => {
  let orchestrator: LifecycleOrchestrator;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
    orchestrator = new LifecycleOrchestrator(mockLogger);
  });

  describe('Module Registration', () => {
    it('should register module instances', () => {
      class TestModule {}
      const module = new TestModule();

      orchestrator.registerModule(module);

      expect(orchestrator['moduleInstances']).toHaveLength(1);
      expect(orchestrator['moduleInstances'][0]).toBe(module);
    });

    it('should register multiple modules', () => {
      class Module1 {}
      class Module2 {}

      orchestrator.registerModule(new Module1());
      orchestrator.registerModule(new Module2());

      expect(orchestrator['moduleInstances']).toHaveLength(2);
    });
  });

  describe('Plugin Registration', () => {
    it('should register plugin instances', () => {
      class TestPlugin {}
      const plugin = new TestPlugin();

      orchestrator.registerPlugin(plugin);

      expect(orchestrator['pluginInstances']).toHaveLength(1);
      expect(orchestrator['pluginInstances'][0]).toBe(plugin);
    });

    it('should register multiple plugins', () => {
      class Plugin1 {}
      class Plugin2 {}

      orchestrator.registerPlugin(new Plugin1());
      orchestrator.registerPlugin(new Plugin2());

      expect(orchestrator['pluginInstances']).toHaveLength(2);
    });
  });

  describe('Initialize Phase', () => {
    it('should call onPluginInit on plugins', async () => {
      const onPluginInit = vi.fn();

      class TestPlugin implements OnPluginInit {
        onPluginInit = onPluginInit;
      }

      const plugin = new TestPlugin();
      orchestrator.registerPlugin(plugin);

      await orchestrator.initialize();

      expect(onPluginInit).toHaveBeenCalledOnce();
    });

    it('should call onModuleInit on modules', async () => {
      const onModuleInit = vi.fn();

      class TestModule implements OnModuleInit {
        onModuleInit = onModuleInit;
      }

      const module = new TestModule();
      orchestrator.registerModule(module);

      await orchestrator.initialize();

      expect(onModuleInit).toHaveBeenCalledOnce();
    });

    it('should initialize plugins before modules', async () => {
      const callOrder: string[] = [];

      class TestPlugin implements OnPluginInit {
        async onPluginInit(): Promise<void> {
          callOrder.push('plugin');
        }
      }

      class TestModule implements OnModuleInit {
        async onModuleInit(): Promise<void> {
          callOrder.push('module');
        }
      }

      orchestrator.registerPlugin(new TestPlugin());
      orchestrator.registerModule(new TestModule());

      await orchestrator.initialize();

      expect(callOrder).toEqual(['plugin', 'module']);
    });

    it('should handle modules without lifecycle hooks', async () => {
      class TestModule {}
      orchestrator.registerModule(new TestModule());

      await expect(orchestrator.initialize()).resolves.not.toThrow();
    });
  });

  describe('Start Phase', () => {
    it('should call onPluginStart on plugins', async () => {
      const onPluginStart = vi.fn();

      class TestPlugin implements OnPluginStart {
        onPluginStart = onPluginStart;
      }

      orchestrator.registerPlugin(new TestPlugin());

      await orchestrator.start();

      expect(onPluginStart).toHaveBeenCalledOnce();
    });

    it('should call onModuleStart on modules', async () => {
      const onModuleStart = vi.fn();

      class TestModule implements OnModuleStart {
        onModuleStart = onModuleStart;
      }

      orchestrator.registerModule(new TestModule());

      await orchestrator.start();

      expect(onModuleStart).toHaveBeenCalledOnce();
    });

    it('should start plugins before modules', async () => {
      const callOrder: string[] = [];

      class TestPlugin implements OnPluginStart {
        async onPluginStart(): Promise<void> {
          callOrder.push('plugin');
        }
      }

      class TestModule implements OnModuleStart {
        async onModuleStart(): Promise<void> {
          callOrder.push('module');
        }
      }

      orchestrator.registerPlugin(new TestPlugin());
      orchestrator.registerModule(new TestModule());

      await orchestrator.start();

      expect(callOrder).toEqual(['plugin', 'module']);
    });
  });

  describe('Ready Phase', () => {
    it('should call onApplicationReady on modules', async () => {
      const onApplicationReady = vi.fn();

      class TestModule implements OnApplicationReady {
        onApplicationReady = onApplicationReady;
      }

      orchestrator.registerModule(new TestModule());

      await orchestrator.ready();

      expect(onApplicationReady).toHaveBeenCalledOnce();
    });

    it('should call onApplicationReady on plugins', async () => {
      const onApplicationReady = vi.fn();

      class TestPlugin implements OnApplicationReady {
        onApplicationReady = onApplicationReady;
      }

      orchestrator.registerPlugin(new TestPlugin());

      await orchestrator.ready();

      expect(onApplicationReady).toHaveBeenCalledOnce();
    });

    it('should notify modules before plugins', async () => {
      const callOrder: string[] = [];

      class TestModule implements OnApplicationReady {
        async onApplicationReady(): Promise<void> {
          callOrder.push('module');
        }
      }

      class TestPlugin implements OnApplicationReady {
        async onApplicationReady(): Promise<void> {
          callOrder.push('plugin');
        }
      }

      orchestrator.registerModule(new TestModule());
      orchestrator.registerPlugin(new TestPlugin());

      await orchestrator.ready();

      expect(callOrder).toEqual(['module', 'plugin']);
    });
  });

  describe('Shutdown Phase', () => {
    it('should call onApplicationShutdown on modules', async () => {
      const onApplicationShutdown = vi.fn();

      class TestModule implements OnApplicationShutdown {
        onApplicationShutdown = onApplicationShutdown;
      }

      orchestrator.registerModule(new TestModule());

      await orchestrator.shutdown();

      expect(onApplicationShutdown).toHaveBeenCalledOnce();
    });

    it('should call onApplicationShutdown on plugins', async () => {
      const onApplicationShutdown = vi.fn();

      class TestPlugin implements OnApplicationShutdown {
        onApplicationShutdown = onApplicationShutdown;
      }

      orchestrator.registerPlugin(new TestPlugin());

      await orchestrator.shutdown();

      expect(onApplicationShutdown).toHaveBeenCalledOnce();
    });
  });

  describe('Stop Phase', () => {
    it('should call onModuleStop on modules', async () => {
      const onModuleStop = vi.fn();

      class TestModule implements OnModuleStop {
        onModuleStop = onModuleStop;
      }

      orchestrator.registerModule(new TestModule());

      await orchestrator.stop();

      expect(onModuleStop).toHaveBeenCalledOnce();
    });

    it('should call onPluginStop on plugins', async () => {
      const onPluginStop = vi.fn();

      class TestPlugin implements OnPluginStop {
        onPluginStop = onPluginStop;
      }

      orchestrator.registerPlugin(new TestPlugin());

      await orchestrator.stop();

      expect(onPluginStop).toHaveBeenCalledOnce();
    });

    it('should stop modules before plugins (reverse order)', async () => {
      const callOrder: string[] = [];

      class TestModule implements OnModuleStop {
        async onModuleStop(): Promise<void> {
          callOrder.push('module');
        }
      }

      class TestPlugin implements OnPluginStop {
        async onPluginStop(): Promise<void> {
          callOrder.push('plugin');
        }
      }

      orchestrator.registerModule(new TestModule());
      orchestrator.registerPlugin(new TestPlugin());

      await orchestrator.stop();

      expect(callOrder).toEqual(['module', 'plugin']);
    });

    it('should stop in reverse registration order', async () => {
      const callOrder: string[] = [];

      class Module1 implements OnModuleStop {
        async onModuleStop(): Promise<void> {
          callOrder.push('module1');
        }
      }

      class Module2 implements OnModuleStop {
        async onModuleStop(): Promise<void> {
          callOrder.push('module2');
        }
      }

      orchestrator.registerModule(new Module1());
      orchestrator.registerModule(new Module2());

      await orchestrator.stop();

      expect(callOrder).toEqual(['module2', 'module1']);
    });
  });

  describe('Complete Lifecycle', () => {
    it('should execute complete startup lifecycle', async () => {
      const callOrder: string[] = [];

      class TestPlugin
        implements OnPluginInit, OnPluginStart, OnApplicationReady
      {
        async onPluginInit(): Promise<void> {
          callOrder.push('plugin-init');
        }
        async onPluginStart(): Promise<void> {
          callOrder.push('plugin-start');
        }
        async onApplicationReady(): Promise<void> {
          callOrder.push('plugin-ready');
        }
      }

      class TestModule
        implements OnModuleInit, OnModuleStart, OnApplicationReady
      {
        async onModuleInit(): Promise<void> {
          callOrder.push('module-init');
        }
        async onModuleStart(): Promise<void> {
          callOrder.push('module-start');
        }
        async onApplicationReady(): Promise<void> {
          callOrder.push('module-ready');
        }
      }

      orchestrator.registerPlugin(new TestPlugin());
      orchestrator.registerModule(new TestModule());

      await orchestrator.initialize();
      await orchestrator.start();
      await orchestrator.ready();

      expect(callOrder).toEqual([
        'plugin-init',
        'module-init',
        'plugin-start',
        'module-start',
        'module-ready',
        'plugin-ready',
      ]);
    });

    it('should execute complete shutdown lifecycle', async () => {
      const callOrder: string[] = [];

      class TestModule implements OnApplicationShutdown, OnModuleStop {
        async onApplicationShutdown(): Promise<void> {
          callOrder.push('module-shutdown');
        }
        async onModuleStop(): Promise<void> {
          callOrder.push('module-stop');
        }
      }

      class TestPlugin implements OnApplicationShutdown, OnPluginStop {
        async onApplicationShutdown(): Promise<void> {
          callOrder.push('plugin-shutdown');
        }
        async onPluginStop(): Promise<void> {
          callOrder.push('plugin-stop');
        }
      }

      orchestrator.registerModule(new TestModule());
      orchestrator.registerPlugin(new TestPlugin());

      await orchestrator.shutdown();
      await orchestrator.stop();

      expect(callOrder).toEqual([
        'module-shutdown',
        'plugin-shutdown',
        'module-stop',
        'plugin-stop',
      ]);
    });
  });
});
