import { describe, it, expect, beforeEach } from 'vitest';
import { createContainer, type AwilixContainer } from '@stratix/runtime';
import { DIPatterns } from '../patterns/DIPatterns.js';

describe('DIPatterns', () => {
  let container: AwilixContainer;

  beforeEach(() => {
    container = createContainer();
  });

  describe('command()', () => {
    it('should register command handler with scoped lifetime', () => {
      class CreateUserHandler {
        id = Math.random();
        execute() {
          return 'created';
        }
      }

      container.register({
        createUserHandler: DIPatterns.command(CreateUserHandler)
      });

      const scope1 = container.createScope();
      const scope2 = container.createScope();

      const handler1a = scope1.resolve<CreateUserHandler>('createUserHandler');
      const handler1b = scope1.resolve<CreateUserHandler>('createUserHandler');
      const handler2 = scope2.resolve<CreateUserHandler>('createUserHandler');

      // Same instance within scope
      expect(handler1a.id).toBe(handler1b.id);
      expect(handler1a).toBe(handler1b);

      // Different instances across scopes
      expect(handler1a.id).not.toBe(handler2.id);
      expect(handler1a).not.toBe(handler2);
    });

    it('should support dependency injection in command handlers', () => {
      class Logger {
        log(msg: string) {
          return msg;
        }
      }

      class CreateUserHandler {
        private logger: Logger;

        constructor({ logger }: { logger: Logger }) {
          this.logger = logger;
        }

        execute() {
          return this.logger.log('creating user');
        }
      }

      container.register({
        logger: DIPatterns.domainService(Logger),
        createUserHandler: DIPatterns.command(CreateUserHandler)
      });

      const handler = container.resolve<CreateUserHandler>('createUserHandler');
      expect(handler.execute()).toBe('creating user');
    });
  });

  describe('query()', () => {
    it('should register query handler with scoped lifetime', () => {
      class GetUserHandler {
        id = Math.random();
        execute() {
          return { name: 'John' };
        }
      }

      container.register({
        getUserHandler: DIPatterns.query(GetUserHandler)
      });

      const scope1 = container.createScope();
      const scope2 = container.createScope();

      const handler1a = scope1.resolve<GetUserHandler>('getUserHandler');
      const handler1b = scope1.resolve<GetUserHandler>('getUserHandler');
      const handler2 = scope2.resolve<GetUserHandler>('getUserHandler');

      // Same instance within scope
      expect(handler1a.id).toBe(handler1b.id);

      // Different instances across scopes
      expect(handler1a.id).not.toBe(handler2.id);
    });
  });

  describe('repository()', () => {
    it('should register repository with singleton lifetime', () => {
      class UserRepository {
        id = Math.random();
        findAll() {
          return [];
        }
      }

      container.register({
        userRepository: DIPatterns.repository(UserRepository)
      });

      const repo1 = container.resolve<UserRepository>('userRepository');
      const repo2 = container.resolve<UserRepository>('userRepository');

      // Same instance always
      expect(repo1.id).toBe(repo2.id);
      expect(repo1).toBe(repo2);
    });

    it('should share singleton repositories across scopes', () => {
      class UserRepository {
        id = Math.random();
      }

      container.register({
        userRepository: DIPatterns.repository(UserRepository)
      });

      const scope1 = container.createScope();
      const scope2 = container.createScope();

      const repo1 = scope1.resolve<UserRepository>('userRepository');
      const repo2 = scope2.resolve<UserRepository>('userRepository');

      // Same instance across scopes
      expect(repo1.id).toBe(repo2.id);
      expect(repo1).toBe(repo2);
    });
  });

  describe('aggregate()', () => {
    it('should register aggregate with transient lifetime', () => {
      class User {
        id = Math.random();
        name: string;

        constructor() {
          this.name = 'John';
        }
      }

      container.register({
        user: DIPatterns.aggregate(User)
      });

      const user1 = container.resolve<User>('user');
      const user2 = container.resolve<User>('user');

      // Different instances every time
      expect(user1.id).not.toBe(user2.id);
      expect(user1.name).toBe('John');
      expect(user2.name).toBe('John');
    });

    it('should create new aggregate instances with dependencies', () => {
      class EventStore {
        events: any[] = [];
      }

      class User {
        id = Math.random();
        eventStore: EventStore;

        constructor({ eventStore }: { eventStore: EventStore }) {
          this.eventStore = eventStore;
        }
      }

      container.register({
        eventStore: DIPatterns.repository(EventStore),
        user: DIPatterns.aggregate(User)
      });

      const user1 = container.resolve<User>('user');
      const user2 = container.resolve<User>('user');

      // Different user instances
      expect(user1.id).not.toBe(user2.id);

      // But same event store (singleton)
      expect(user1.eventStore).toBe(user2.eventStore);
    });
  });

  describe('domainService()', () => {
    it('should register domain service with singleton lifetime', () => {
      class PricingService {
        id = Math.random();
        calculatePrice(base: number) {
          return base + 10;
        }
      }

      container.register({
        pricingService: DIPatterns.domainService(PricingService)
      });

      const service1 = container.resolve<PricingService>('pricingService');
      const service2 = container.resolve<PricingService>('pricingService');

      // Same instance always
      expect(service1.id).toBe(service2.id);
      expect(service1).toBe(service2);
      expect(service1.calculatePrice(100)).toBe(110);
    });
  });

  describe('applicationService()', () => {
    it('should register application service with singleton lifetime', () => {
      class UserService {
        id = Math.random();
        registerUser(name: string) {
          return { id: 1, name };
        }
      }

      container.register({
        userService: DIPatterns.applicationService(UserService)
      });

      const service1 = container.resolve<UserService>('userService');
      const service2 = container.resolve<UserService>('userService');

      // Same instance always
      expect(service1.id).toBe(service2.id);
      expect(service1).toBe(service2);
    });
  });

  describe('factory()', () => {
    it('should register factory with transient lifetime', () => {
      let counter = 0;

      const userFactory = () => {
        return (name: string) => ({
          id: ++counter,
          name
        });
      };

      container.register({
        userFactory: DIPatterns.factory(userFactory)
      });

      // Each resolution gets a new factory function
      const factory1 = container.resolve<(name: string) => { id: number; name: string }>('userFactory');
      const factory2 = container.resolve<(name: string) => { id: number; name: string }>('userFactory');

      const user1 = factory1('Alice');
      const user2 = factory2('Bob');

      expect(user1.id).toBe(1);
      expect(user2.id).toBe(2);
    });

    it('should support dependencies in factories', () => {
      class Validator {
        validate(name: string) {
          return name.length > 0;
        }
      }

      const userFactory = (deps: { validator: Validator }) => {
        return (name: string) => {
          if (!deps.validator.validate(name)) {
            throw new Error('Invalid name');
          }
          return { name };
        };
      };

      container.register({
        validator: DIPatterns.domainService(Validator),
        userFactory: DIPatterns.factory(userFactory)
      });

      const factory = container.resolve<(name: string) => { name: string }>('userFactory');

      expect(factory('Alice')).toEqual({ name: 'Alice' });
      expect(() => factory('')).toThrow('Invalid name');
    });
  });

  describe('integration scenarios', () => {
    it('should support typical DDD/CQRS application setup', () => {
      class Logger {
        logs: string[] = [];
        log(msg: string) {
          this.logs.push(msg);
        }
      }

      class UserRepository {
        logger: Logger;

        constructor({ logger }: { logger: Logger }) {
          this.logger = logger;
        }

        save(user: any) {
          this.logger.log('User saved');
          return user;
        }
      }

      class User {
        name: string;

        constructor() {
          this.name = 'default';
        }
      }

      class CreateUserHandler {
        userRepository: UserRepository;
        logger: Logger;

        constructor({ userRepository, logger }: { userRepository: UserRepository; logger: Logger }) {
          this.userRepository = userRepository;
          this.logger = logger;
        }

        execute(name: string) {
          const user = new User();
          user.name = name;
          this.logger.log('Creating user');
          return this.userRepository.save(user);
        }
      }

      container.register({
        logger: DIPatterns.domainService(Logger),
        userRepository: DIPatterns.repository(UserRepository),
        user: DIPatterns.aggregate(User),
        createUserHandler: DIPatterns.command(CreateUserHandler)
      });

      const scope = container.createScope();
      const handler = scope.resolve<CreateUserHandler>('createUserHandler');
      const result = handler.execute('Alice');

      expect(result.name).toBe('Alice');

      const logger = container.resolve<Logger>('logger');
      expect(logger.logs).toContain('Creating user');
      expect(logger.logs).toContain('User saved');
    });

    it('should ensure correct lifetime semantics across patterns', () => {
      class Singleton {
        id = Math.random();
      }

      class Transient {
        id = Math.random();
      }

      class Scoped {
        id = Math.random();
      }

      container.register({
        singleton: DIPatterns.repository(Singleton),
        transient: DIPatterns.aggregate(Transient),
        scoped: DIPatterns.command(Scoped)
      });

      const scope1 = container.createScope();
      const scope2 = container.createScope();

      // Singleton - same everywhere
      const s1 = scope1.resolve<Singleton>('singleton');
      const s2 = scope2.resolve<Singleton>('singleton');
      expect(s1).toBe(s2);

      // Transient - always different
      const t1 = scope1.resolve<Transient>('transient');
      const t2 = scope1.resolve<Transient>('transient');
      expect(t1).not.toBe(t2);

      // Scoped - same within scope, different across scopes
      const sc1a = scope1.resolve<Scoped>('scoped');
      const sc1b = scope1.resolve<Scoped>('scoped');
      const sc2 = scope2.resolve<Scoped>('scoped');
      expect(sc1a).toBe(sc1b);
      expect(sc1a).not.toBe(sc2);
    });
  });
});
