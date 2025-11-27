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
export type { Result } from './result/Result.js';
export { Success, Failure, ResultUtils } from './result/Result.js';
export { Results } from './result/helpers.js';
export { AsyncResults } from './result/AsyncResults.js';

// Validation
export { Validators } from './validation/Validators.js';
export { ValueObjectFactory } from './value-objects/ValueObjectFactory.js';

// Errors
export { DomainError } from './errors/DomainError.js';

// Mapping
export { Mapper } from './mapping/Mapper.js';
export * from './security/SecretsProvider.js';

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

// Patterns
export { Specification, fromPredicate } from './patterns/Specification.js';
export type { SpecificationResult } from './patterns/Specification.js';

// ========================================
// ABSTRACTIONS & INTERFACES
// ========================================

// Container (Dependency Injection)
export type { Token } from './container/Token.js';
export type { Factory } from './container/Factory.js';
export type { ResolutionContext } from './container/ResolutionContext.js';
export type { RegisterOptions } from './container/RegisterOptions.js';
export type { Container } from './container/Container.js';
export { ServiceLifetime } from './container/ServiceLifetime.js';

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

// Infrastructure
export { LogLevel } from './infrastructure/LogLevel.js';
export type { Logger } from './infrastructure/Logger.js';
export type { Repository } from './infrastructure/Repository.js';
export type { UnitOfWork } from './infrastructure/UnitOfWork.js';
export { HealthStatus } from './infrastructure/HealthCheck.js';
export type { HealthCheckResult, HealthCheck } from './infrastructure/HealthCheck.js';

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
  ContextRepositoryDefinition,
} from './context/definitions.js';

// ========================================
// AI AGENTS
// ========================================

// Re-export everything from ai-agents
export * from './ai-agents/index.js';

// Also export types from ai-agents/types.ts explicitly
export type {
  AgentId,
  AgentVersion,
  AgentCapability,
  AgentMessage,
  TokenUsage,
  ToolCall,
} from './ai-agents/types.js';

// Export AgentCapabilities constant
export { AgentCapabilities } from './ai-agents/types.js';

// Export AI Agent primitives
export { AIAgent } from './ai-agents/AIAgent.js';
export { AgentContext } from './ai-agents/AgentContext.js';
export { AgentResult } from './ai-agents/AgentResult.js';
export { ExecutionTrace } from './ai-agents/ExecutionTrace.js';
export type { StreamableAgent } from './ai-agents/StreamableAgent.js';
export type { AgentMemory } from './ai-agents/AgentMemory.js';
export type * as AgentEvents from './ai-agents/events.js';

// AI Agent Errors
export {
  AgentError,
  AgentExecutionError,
  AgentBudgetExceededError,
  AgentTimeoutError,
  AgentToolError,
  AgentValidationError,
  AgentConfigurationError,
  LLMProviderError,
} from './ai-agents/errors.js';
