import { describe, it, expect, beforeEach } from 'vitest';
import { createContainer, asClass, asValue, type AwilixContainer } from '@stratix/runtime';
import { createToken } from '../tokens/createToken.js';
import { TOKENS } from '../tokens/tokens.js';
import type { CommandBus, QueryBus, EventBus, Logger } from '@stratix/core';

describe('Type-Safe Tokens', () => {
  let container: AwilixContainer;

  beforeEach(() => {
    container = createContainer();
  });

  describe('createToken()', () => {
    it('should create a token with name and symbol', () => {
      const token = createToken<string>('myService');

      expect(token.name).toBe('myService');
      expect(token.symbol).toBeDefined();
      expect(typeof token.symbol).toBe('symbol');
    });

    it('should create unique symbols for different tokens', () => {
      const token1 = createToken<string>('service1');
      const token2 = createToken<string>('service2');

      expect(token1.symbol).not.toBe(token2.symbol);
    });

    it('should create unique symbols even with same name', () => {
      const token1 = createToken<string>('service');
      const token2 = createToken<string>('service');

      // Different instances, different symbols
      expect(token1.symbol).not.toBe(token2.symbol);
    });

    it('should resolve service from container with type safety', () => {
      interface UserRepository {
        findAll(): string[];
      }

      const USER_REPO = createToken<UserRepository>('userRepository');

      const repo: UserRepository = {
        findAll: () => ['user1', 'user2']
      };

      container.register({
        userRepository: asValue(repo)
      });

      const resolved = USER_REPO.resolve(container);
      expect(resolved).toBe(repo);
      expect(resolved.findAll()).toEqual(['user1', 'user2']);
    });

    it('should provide type safety at compile time', () => {
      class Logger {
        log(msg: string) {
          return msg;
        }
      }

      const LOGGER = createToken<Logger>('logger');

      container.register({
        logger: asClass(Logger).singleton()
      });

      const logger = LOGGER.resolve(container);

      // TypeScript should know logger has a log method
      expect(logger.log('test')).toBe('test');
    });

    it('should work with generic types', () => {
      interface Repository<T> {
        findById(id: string): T | null;
      }

      interface User {
        id: string;
        name: string;
      }

      const USER_REPO = createToken<Repository<User>>('userRepository');

      const repo: Repository<User> = {
        findById: (id: string) => ({ id, name: 'John' })
      };

      container.register({
        userRepository: asValue(repo)
      });

      const resolved = USER_REPO.resolve(container);
      const user = resolved.findById('123');
      expect(user?.name).toBe('John');
    });

    it('should throw when resolving unregistered service', () => {
      const LOGGER = createToken<Logger>('logger');

      expect(() => LOGGER.resolve(container)).toThrow();
    });
  });

  describe('TOKENS - Pre-defined tokens', () => {
    it('should have COMMAND_BUS token', () => {
      expect(TOKENS.COMMAND_BUS).toBeDefined();
      expect(TOKENS.COMMAND_BUS.name).toBe('commandBus');
    });

    it('should have QUERY_BUS token', () => {
      expect(TOKENS.QUERY_BUS).toBeDefined();
      expect(TOKENS.QUERY_BUS.name).toBe('queryBus');
    });

    it('should have EVENT_BUS token', () => {
      expect(TOKENS.EVENT_BUS).toBeDefined();
      expect(TOKENS.EVENT_BUS.name).toBe('eventBus');
    });

    it('should have LOGGER token', () => {
      expect(TOKENS.LOGGER).toBeDefined();
      expect(TOKENS.LOGGER.name).toBe('logger');
    });

    it('should have CONFIG token', () => {
      expect(TOKENS.CONFIG).toBeDefined();
      expect(TOKENS.CONFIG.name).toBe('config');
    });

    it('should resolve COMMAND_BUS with type safety', () => {
      const mockCommandBus: CommandBus = {
        register: () => {},
        execute: async () => ({ isSuccess: true, value: undefined })
      } as any;

      container.register({
        commandBus: asValue(mockCommandBus)
      });

      const commandBus = TOKENS.COMMAND_BUS.resolve(container);
      expect(commandBus).toBe(mockCommandBus);
    });

    it('should resolve QUERY_BUS with type safety', () => {
      const mockQueryBus: QueryBus = {
        register: () => {},
        execute: async () => ({ isSuccess: true, value: undefined })
      } as any;

      container.register({
        queryBus: asValue(mockQueryBus)
      });

      const queryBus = TOKENS.QUERY_BUS.resolve(container);
      expect(queryBus).toBe(mockQueryBus);
    });

    it('should resolve EVENT_BUS with type safety', () => {
      const mockEventBus: EventBus = {
        subscribe: () => {},
        publish: async () => {},
        unsubscribe: () => {}
      } as any;

      container.register({
        eventBus: asValue(mockEventBus)
      });

      const eventBus = TOKENS.EVENT_BUS.resolve(container);
      expect(eventBus).toBe(mockEventBus);
    });

    it('should resolve LOGGER with type safety', () => {
      const mockLogger: Logger = {
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

    it('should resolve CONFIG with type safety', () => {
      const config = {
        database: { host: 'localhost', port: 5432 },
        server: { port: 3000 }
      };

      container.register({
        config: asValue(config)
      });

      const resolved = TOKENS.CONFIG.resolve(container);
      expect(resolved).toBe(config);
      expect(resolved.database.host).toBe('localhost');
    });
  });

  describe('Token integration scenarios', () => {
    it('should support multiple tokens in application setup', () => {
      class ConsoleLogger implements Logger {
        debug() {}
        info() {}
        warn() {}
        error() {}
      }

      const mockCommandBus: CommandBus = {
        register: () => {},
        execute: async () => ({ isSuccess: true, value: undefined })
      } as any;

      const mockQueryBus: QueryBus = {
        register: () => {},
        execute: async () => ({ isSuccess: true, value: undefined })
      } as any;

      container.register({
        logger: asClass(ConsoleLogger).singleton(),
        commandBus: asValue(mockCommandBus),
        queryBus: asValue(mockQueryBus)
      });

      const logger = TOKENS.LOGGER.resolve(container);
      const commandBus = TOKENS.COMMAND_BUS.resolve(container);
      const queryBus = TOKENS.QUERY_BUS.resolve(container);

      expect(logger).toBeInstanceOf(ConsoleLogger);
      expect(commandBus).toBe(mockCommandBus);
      expect(queryBus).toBe(mockQueryBus);
    });

    it('should work with custom tokens alongside predefined tokens', () => {
      interface UserService {
        getUser(id: string): Promise<any>;
      }

      const USER_SERVICE = createToken<UserService>('userService');

      const mockLogger: Logger = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {}
      };

      const mockUserService: UserService = {
        getUser: async (id: string) => ({ id, name: 'John' })
      };

      container.register({
        logger: asValue(mockLogger),
        userService: asValue(mockUserService)
      });

      const logger = TOKENS.LOGGER.resolve(container);
      const userService = USER_SERVICE.resolve(container);

      expect(logger).toBe(mockLogger);
      expect(userService).toBe(mockUserService);
    });

    it('should prevent typos with compile-time safety', () => {
      class Logger {
        log(msg: string) {
          return msg;
        }
      }

      const LOGGER = createToken<Logger>('logger');

      container.register({
        logger: asClass(Logger).singleton()
      });

      // This would be a compile error if we tried to resolve with wrong name:
      // container.resolve<Logger>('loger'); // typo!

      // But with tokens, the name is encapsulated:
      const logger = LOGGER.resolve(container);
      expect(logger.log('test')).toBe('test');
    });

    it('should support dependency injection with tokens', () => {
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
          this.logger.log('Finding all users');
          return [];
        }
      }

      const LOGGER = createToken<Logger>('logger');
      const USER_REPO = createToken<UserRepository>('userRepository');

      container.register({
        logger: asClass(Logger).singleton(),
        userRepository: asClass(UserRepository).singleton()
      });

      const logger = LOGGER.resolve(container);
      const repo = USER_REPO.resolve(container);

      expect(repo.logger).toBe(logger);
      expect(repo.findAll()).toEqual([]);
    });
  });
});
