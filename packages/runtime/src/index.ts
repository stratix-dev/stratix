// ========================================
// DEPENDENCY INJECTION (Awilix)
// ========================================
// Re-export Awilix - Built-in DI container for Stratix
export * from './di/awilix.js';

// Builder
export { ApplicationBuilder } from './builder/ApplicationBuilder.js';
export type { ApplicationBuilderOptions } from './builder/ApplicationBuilder.js';
export { ApplicationBuilderHelpers } from './builder/ApplicationBuilderHelpers.js';
export { Application } from './builder/Application.js';
export { DefaultPluginContext } from './builder/DefaultPluginContext.js';

// Context
export { BaseContext } from './context/BaseContext.js';
export { ContextRegistry } from './context/ContextRegistry.js';
export { DefaultContextConfig } from './context/DefaultContextConfig.js';

// Registry
export { PluginRegistry } from './registry/PluginRegistry.js';

// Lifecycle
export { LifecycleManager, LifecyclePhase } from './lifecycle/LifecycleManager.js';

// Graph
export { DependencyGraph } from './graph/DependencyGraph.js';

// Errors
export {
  RuntimeError,
  CircularDependencyError,
  MissingDependencyError,
  DuplicatePluginError,
  PluginLifecycleError,
} from './errors/RuntimeError.js';

// AI Agent Runtime
export { StratixAgentOrchestrator } from './ai/StratixAgentOrchestrator.js';
export { InMemoryAgentRepository } from './ai/InMemoryAgentRepository.js';
export { InMemoryAgentMemory } from './ai/InMemoryAgentMemory.js';
export { InMemoryExecutionAuditLog } from './ai/InMemoryExecutionAuditLog.js';
export { InMemoryToolRegistry } from './ai/InMemoryToolRegistry.js';
export { InMemoryVectorStore } from './ai/InMemoryVectorStore.js';
export { RecursiveTextChunker } from './ai/RecursiveTextChunker.js';
export { MarkdownChunker } from './ai/MarkdownChunker.js';
export { StandardRAGPipeline } from './ai/StandardRAGPipeline.js';

// Guardrails
export { StandardGuardrailChain } from './ai/StandardGuardrailChain.js';
export { PIIGuardrail, PromptInjectionGuardrail, TopicFilterGuardrail, ContentLengthGuardrail } from './ai/guardrails/index.js';
export type { PIIGuardrailConfig, PromptInjectionGuardrailConfig, TopicFilterGuardrailConfig, ContentLengthGuardrailConfig } from './ai/guardrails/index.js';

// CQRS Implementations
export { InMemoryCommandBus } from './messaging/InMemoryCommandBus.js';
export { InMemoryQueryBus } from './messaging/InMemoryQueryBus.js';
export { InMemoryEventBus } from './messaging/InMemoryEventBus.js';

// Infrastructure Implementations
export { ConsoleLogger } from './infrastructure/ConsoleLogger.js';
export { SecretsManager } from './infrastructure/SecretsManager.js';
export type { ConsoleLoggerOptions } from './infrastructure/ConsoleLogger.js';
export type { SecretsManagerConfig } from './infrastructure/SecretsManager.js';
export { InMemoryRepository } from './infrastructure/InMemoryRepository.js';
export { TokenBucketRateLimiter } from './infrastructure/TokenBucketRateLimiter.js';

// Testing Utilities
export { TestHelpers } from './testing/TestHelpers.js';

// Context Utilities
export { ContextHelpers } from './context/ContextHelpers.js';
export type { SimpleContextOptions } from './context/ContextHelpers.js';

// Container Utilities
export { ContainerHelpers } from './container/ContainerHelpers.js';
export type { CommandRegistration, QueryRegistration } from './container/ContainerHelpers.js';
