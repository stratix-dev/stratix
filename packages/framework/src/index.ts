/**
 * @stratix/framework
 *
 * Decorator-based DDD framework with CQRS, Event Sourcing, and AI agents.
 *
 * @packageDocumentation
 */

// Re-export core types
export * from '@stratix/core';

// Domain decorators
export { Aggregate, type AggregateOptions } from './decorators/domain/Aggregate.js';
export { DomainEvent } from './decorators/domain/DomainEvent.js';
export { Validate, Validators, type ValidatorFn } from './decorators/domain/Validate.js';

// Application decorators
export { Command } from './decorators/application/Command.js';
export { CommandHandler } from './decorators/application/CommandHandler.js';
export { Query } from './decorators/application/Query.js';
export { QueryHandler } from './decorators/application/QueryHandler.js';
export { EventHandler, On } from './decorators/application/EventHandler.js';
export { Injectable } from './decorators/application/Injectable.js';
export { Inject } from './decorators/application/Inject.js';
export { Module, type Provider, type ModuleDecoratorMetadata } from './decorators/application/Module.js';

// Core decorators
export { StratixApp, type StratixAppMetadata } from './decorators/core/StratixApp.js';
export { Plugin, type PluginDecoratorMetadata } from './decorators/core/Plugin.js';

// Lifecycle hooks
export {
  type OnModuleInit,
  type OnModuleStart,
  type OnModuleStop,
  type OnPluginInit,
  type OnPluginStart,
  type OnPluginStop,
  type OnApplicationReady,
  type OnApplicationShutdown,
  hasOnModuleInit,
  hasOnModuleStart,
  hasOnModuleStop,
  hasOnPluginInit,
  hasOnPluginStart,
  hasOnPluginStop,
  hasOnApplicationReady,
  hasOnApplicationShutdown,
} from './lifecycle/interfaces.js';

// Bootstrap
export { bootstrap, type BootstrapOptions } from './bootstrap/bootstrap.js';

// Runtime
export { StratixApplication } from './runtime/StratixApplication.js';
export { LifecycleOrchestrator } from './runtime/LifecycleOrchestrator.js';
export { MetadataStorage } from './runtime/MetadataStorage.js';

// Messaging implementations
export { InMemoryCommandBus } from './messaging/InMemoryCommandBus.js';
export { InMemoryQueryBus } from './messaging/InMemoryQueryBus.js';
export { InMemoryEventBus } from './messaging/InMemoryEventBus.js';

// Infrastructure implementations
export { ConsoleLogger } from './infrastructure/ConsoleLogger.js';

// Re-export Awilix for direct access
export type { AwilixContainer } from 'awilix';
export {
  createContainer,
  asClass,
  asFunction,
  asValue,
  Lifetime,
  InjectionMode,
} from 'awilix';
