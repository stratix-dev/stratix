/**
 * Awilix dependency injection container - Built into Stratix Runtime.
 *
 * Stratix uses Awilix as its official DI container implementation.
 * All Awilix features are available directly to developers.
 *
 * @see https://github.com/jeffijoe/awilix
 *
 * @example Basic Usage
 * ```typescript
 * import { createContainer, asClass, asFunction, asValue } from '@stratix/runtime';
 *
 * const container = createContainer();
 *
 * container.register({
 *   // Register a class with auto-wiring
 *   userService: asClass(UserService).singleton(),
 *
 *   // Register a factory function
 *   logger: asFunction(() => new Logger()).singleton(),
 *
 *   // Register a value
 *   config: asValue({ port: 3000 })
 * });
 *
 * const service = container.resolve('userService');
 * ```
 *
 * @example Lifetimes
 * ```typescript
 * container.register({
 *   // Singleton - one instance for the entire application
 *   database: asClass(Database).singleton(),
 *
 *   // Scoped - one instance per scope (e.g., per request)
 *   requestContext: asClass(RequestContext).scoped(),
 *
 *   // Transient - new instance every time
 *   requestId: asFunction(() => crypto.randomUUID()).transient()
 * });
 * ```
 *
 * @example Dependency Injection Modes
 * ```typescript
 * // PROXY mode (default) - parameter name-based injection
 * class UserService {
 *   constructor(userRepository, logger) {
 *     this.userRepository = userRepository;
 *     this.logger = logger;
 *   }
 * }
 * container.register({
 *   userService: asClass(UserService).singleton()
 * });
 *
 * // CLASSIC mode - array-based dependency declaration
 * class OrderService {
 *   static inject = ['orderRepository', 'eventBus'];
 *   constructor(orderRepository, eventBus) {
 *     this.orderRepository = orderRepository;
 *     this.eventBus = eventBus;
 *   }
 * }
 * container.register({
 *   orderService: asClass(OrderService).classic().singleton()
 * });
 * ```
 *
 * @example Scoped Containers
 * ```typescript
 * const scope = container.createScope();
 *
 * // Scoped services get new instances
 * const ctx1 = scope.resolve('requestContext');
 * const ctx2 = scope.resolve('requestContext');
 * // ctx1 === ctx2 (same scope)
 *
 * await scope.dispose(); // Clean up
 * ```
 */

// Re-export everything from Awilix
export {
  // Container
  type AwilixContainer,
  createContainer,

  // Resolvers
  type Resolver,
  type BuildResolver,
  type DisposableResolver,
  asClass,
  asFunction,
  asValue,

  // Lifetime
  Lifetime,

  // Injection Mode
  InjectionMode,

  // Registration
  type NameAndRegistrationPair,

  // Types
  type Constructor,
  type ClassOrFunctionReturning,
  type FunctionReturning,

  // Module loading
  listModules,
  type ListModulesOptions,
  type GlobWithOptions
} from 'awilix';
