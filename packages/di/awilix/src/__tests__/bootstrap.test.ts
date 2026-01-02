import { describe, it, expect } from 'vitest';
import { createStratixContainer } from '../bootstrap/createStratixContainer.js';
import { createContainer, asClass, asValue } from '@stratix/runtime';
import { DIPatterns } from '../patterns/DIPatterns.js';
import { createToken } from '../tokens/createToken.js';
import { TOKENS } from '../tokens/tokens.js';

describe('Bootstrap - createStratixContainer', () => {
  describe('createStratixContainer()', () => {
    it('should create a container', () => {
      const container = createStratixContainer();

      expect(container).toBeDefined();
      expect(container.register).toBeDefined();
      expect(container.resolve).toBeDefined();
      expect(container.createScope).toBeDefined();
    });

    it('should create container without options', () => {
      const container = createStratixContainer();

      expect(() => {
        container.register({
          test: asValue('test')
        });
      }).not.toThrow();

      expect(container.resolve('test')).toBe('test');
    });

    it('should create container with empty options', () => {
      const container = createStratixContainer({});

      expect(() => {
        container.register({
          test: asValue('test')
        });
      }).not.toThrow();
    });

    it('should create container with infrastructure option', () => {
      const container = createStratixContainer({
        infrastructure: true
      });

      expect(container).toBeDefined();
    });

    it('should create container with environment option', () => {
      const container = createStratixContainer({
        environment: 'production'
      });

      expect(container).toBeDefined();
    });

    it('should create container with all options', () => {
      const container = createStratixContainer({
        infrastructure: true,
        environment: 'test'
      });

      expect(container).toBeDefined();
    });

    it('should allow service registration', () => {
      const container = createStratixContainer();

      class UserService {
        getUser() {
          return { id: '1', name: 'John' };
        }
      }

      container.register({
        userService: asClass(UserService).singleton()
      });

      const userService = container.resolve<UserService>('userService');
      expect(userService.getUser()).toEqual({ id: '1', name: 'John' });
    });

    it('should support scoped containers', () => {
      const container = createStratixContainer();

      let counter = 0;
      class RequestContext {
        id = ++counter;
      }

      container.register({
        requestContext: asClass(RequestContext).scoped()
      });

      const scope1 = container.createScope();
      const scope2 = container.createScope();

      const ctx1 = scope1.resolve<RequestContext>('requestContext');
      const ctx2 = scope2.resolve<RequestContext>('requestContext');

      expect(ctx1.id).not.toBe(ctx2.id);
    });

    it('should behave identically to createContainer from runtime', () => {
      const runtimeContainer = createContainer();
      const stratixContainer = createStratixContainer();

      // Both should have same methods
      expect(typeof runtimeContainer.register).toBe(typeof stratixContainer.register);
      expect(typeof runtimeContainer.resolve).toBe(typeof stratixContainer.resolve);
      expect(typeof runtimeContainer.createScope).toBe(typeof stratixContainer.createScope);

      // Both should work the same way
      class TestService {
        getValue() {
          return 'test';
        }
      }

      runtimeContainer.register({
        testService: asClass(TestService).singleton()
      });

      stratixContainer.register({
        testService: asClass(TestService).singleton()
      });

      const service1 = runtimeContainer.resolve<TestService>('testService');
      const service2 = stratixContainer.resolve<TestService>('testService');

      expect(service1.getValue()).toBe(service2.getValue());
    });

    it('should support multiple containers', () => {
      const container1 = createStratixContainer();
      const container2 = createStratixContainer();

      container1.register({
        value: asValue('container1')
      });

      container2.register({
        value: asValue('container2')
      });

      expect(container1.resolve('value')).toBe('container1');
      expect(container2.resolve('value')).toBe('container2');
    });

    it('should be suitable for Stratix application patterns', () => {
      const container = createStratixContainer();

      // Typical Stratix setup
      class Logger {
        log(msg: string) {
          return msg;
        }
      }

      class UserRepository {
        logger: Logger;

        constructor({ logger }: { logger: Logger }) {
          this.logger = logger;
        }

        findAll() {
          this.logger.log('Finding users');
          return [];
        }
      }

      class CreateUserHandler {
        repository: UserRepository;
        logger: Logger;

        constructor({ userRepository, logger }: { userRepository: UserRepository; logger: Logger }) {
          this.repository = userRepository;
          this.logger = logger;
        }

        execute() {
          this.logger.log('Creating user');
          return this.repository.findAll();
        }
      }

      container.register({
        logger: asClass(Logger).singleton(),
        userRepository: asClass(UserRepository).singleton(),
        createUserHandler: asClass(CreateUserHandler).scoped()
      });

      const scope = container.createScope();
      const handler = scope.resolve<CreateUserHandler>('createUserHandler');

      expect(handler.execute()).toEqual([]);
    });
  });

  describe('StratixContainerOptions', () => {
    it('should accept infrastructure option', () => {
      expect(() => {
        createStratixContainer({ infrastructure: true });
      }).not.toThrow();

      expect(() => {
        createStratixContainer({ infrastructure: false });
      }).not.toThrow();
    });

    it('should accept environment option with valid values', () => {
      expect(() => {
        createStratixContainer({ environment: 'development' });
      }).not.toThrow();

      expect(() => {
        createStratixContainer({ environment: 'production' });
      }).not.toThrow();

      expect(() => {
        createStratixContainer({ environment: 'test' });
      }).not.toThrow();
    });

    it('should handle different option combinations', () => {
      const configs = [
        {},
        { infrastructure: true },
        { infrastructure: false },
        { environment: 'development' },
        { environment: 'production' },
        { environment: 'test' },
        { infrastructure: true, environment: 'development' },
        { infrastructure: false, environment: 'production' },
        { infrastructure: true, environment: 'test' }
      ];

      configs.forEach((config) => {
        expect(() => {
          const container = createStratixContainer(config as any);
          container.register({
            test: asValue('test')
          });
        }).not.toThrow();
      });
    });
  });

  describe('Integration with other utilities', () => {
    it('should work with DIPatterns', () => {
      const container = createStratixContainer();

      class UserRepository {
        findAll() {
          return [];
        }
      }

      container.register({
        userRepository: DIPatterns.repository(UserRepository)
      });

      const repo = container.resolve<UserRepository>('userRepository');
      expect(repo.findAll()).toEqual([]);
    });

    it('should work with type-safe tokens', () => {
      const container = createStratixContainer();

      interface Logger {
        log(msg: string): void;
      }

      const LOGGER = createToken<Logger>('logger');

      const mockLogger: Logger = {
        log: () => {}
      };

      container.register({
        logger: asValue(mockLogger)
      });

      const logger = LOGGER.resolve(container);
      expect(logger).toBe(mockLogger);
    });

    it('should work with pre-defined TOKENS', () => {
      const container = createStratixContainer();

      const mockLogger = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {}
      };

      container.register({
        logger: asValue(mockLogger)
      });

      const logger = TOKENS.LOGGER.resolve(container);
      expect(logger).toBe(mockLogger);
    });
  });
});
