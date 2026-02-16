// Public API Surface of Stratix

// Runtime
export * from './runtime/index.js';

// Core Patterns - Result
export type { Result } from './core/patterns/result/index.js';
export { Success, Failure, AsyncResults, Results } from './core/patterns/result/index.js';

// Core Patterns - DDD
export {
  Entity,
  EntityId,
  AggregateRoot,
  ValueObject,
  EntityBuilder,
  DomainService,
  DomainError,
  Validators
} from './core/patterns/ddd/index.js';
export type { DomainEvent } from './core/patterns/ddd/index.js';
