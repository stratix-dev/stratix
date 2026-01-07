// ========================================
// DOMAIN PRIMITIVES
// ========================================

// Core
export { ValueObject } from './core/ValueObject.js';
export { Entity } from './core/Entity.js';
export { EntityId } from './core/EntityId.js';
export { EntityBuilder } from './core/EntityBuilder.js';
export { AggregateRoot } from './core/AggregateRoot.js';
export type { DomainEvent } from './core/DomainEvent.js';
export { DomainService } from './core/DomainService.js';
export type { DomainServiceMethod, AsyncDomainServiceMethod } from './core/DomainService.js';

// Result Pattern
export * from './result/index.js';
export { ResultUtils } from './result/Result.js';

// Validation
export { Validators } from './validation/Validators.js';
export { ValueObjectFactory } from './value-objects/ValueObjectFactory.js';

// Errors
export { DomainError } from './errors/DomainError.js';

// Value Objects
export { Currency } from './value-objects/Currency.js';
export { Money } from './value-objects/Money.js';
export { Email } from './value-objects/Email.js';
export { URL } from './value-objects/URL.js';
export { PhoneNumber } from './value-objects/PhoneNumber.js';
export { CountryCallingCodeRegistry } from './value-objects/CountryCallingCode.js';
export type { CountryCallingCodeInfo } from './value-objects/CountryCallingCode.js';
export { CountryRegistry } from './value-objects/CountryRegistry.js';
export type { CountryInfo } from './value-objects/CountryRegistry.js';
export { DateRange } from './value-objects/DateRange.js';
export { Percentage } from './value-objects/Percentage.js';
export { Address } from './value-objects/Address.js';
export type { AddressProps } from './value-objects/Address.js';
export { UUID } from './value-objects/UUID.js';

// ========================================
// ABSTRACTIONS & INTERFACES
// ========================================

// Container (Dependency Injection)
export type { Container } from './container/Container.js';
export type { RegistrationOptions } from './container/RegistrationOptions.js';
export type { Resolver } from './container/Resolver.js';
export { DependencyLifetime } from './container/DependencyLifetime.js';

// Messaging (CQRS)
export type { Command } from './messaging/Command.js';
export type { Query } from './messaging/Query.js';
export type { Event } from './messaging/Event.js';
export type { CommandHandler } from './messaging/CommandHandler.js';
export type { QueryHandler } from './messaging/QueryHandler.js';
export type { EventHandler } from './messaging/EventHandler.js';
export type { CommandBus } from './messaging/CommandBus.js';
export type { QueryBus } from './messaging/QueryBus.js';
export type { EventBus } from './messaging/EventBus.js';
export { BaseCommandHandler, BaseQueryHandler } from './messaging/BaseHandlers.js';
export type { CommandHandlerMetadata } from './messaging/CommandHandlerMetadata.js';
export type { EventHandlerMetadata } from './messaging/EventHandlerMetadata.js';

// Infrastructure
export { LogLevel } from './infrastructure/LogLevel.js';
export type { Logger } from './infrastructure/Logger.js';
export type { Repository } from './infrastructure/Repository.js';
export type { UnitOfWork } from './infrastructure/UnitOfWork.js';
export { HealthStatus } from './infrastructure/HealthCheck.js';
export type { HealthCheckResult, HealthCheck } from './infrastructure/HealthCheck.js';
export type {
  RateLimiter,
  RateLimitResult,
  RateLimitConfig
} from './infrastructure/RateLimiter.js';
export { RateLimitExceededError } from './infrastructure/RateLimiter.js';

// Plugin System
export type { PluginMetadata } from './plugin/PluginMetadata.js';
export type { PluginContext } from './plugin/PluginContext.js';
export type { Plugin } from './plugin/Plugin.js';

// Context System
export type { ContextMetadata } from './context/ContextMetadata.js';
export type { ContextConfig } from './context/ContextConfig.js';
export type { Context } from './context/Context.js';
export type {
  ContextCommandDefinition,
  ContextQueryDefinition,
  ContextEventHandlerDefinition,
  ContextRepositoryDefinition
} from './context/definitions.js';

// Types
export type { ClassConstructor } from './types/ClassConstructor.js';
export type { Buses } from './types/Buses.js';
// ========================================
// AI AGENTS
// ========================================

// Re-export everything from ai-agents module
export * from './ai-agents/index.js';
