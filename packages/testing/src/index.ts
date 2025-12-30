// Legacy testing utilities
export { TestApplication, createTestApp } from './TestApplication.js';
export { EntityBuilder, entityBuilder } from './builders/EntityBuilder.js';
export { DataFactory } from './factories/DataFactory.js';
export {
  assertSuccess as assertResultSuccess,
  assertFailure as assertResultFailure,
  unwrapSuccess as unwrapResultSuccess,
  unwrapFailure as unwrapResultFailure,
} from './utils/assertions.js';

// ============================================================================
// AI Agent Testing Utilities (v2.0)
// ============================================================================

// Mock LLM Provider
export { MockLLMProvider } from './MockLLMProvider.js';
export type { MockResponse } from './MockLLMProvider.js';

// AgentTester
export {
  AgentTester,
  createLoggingLifecycle,
  createCapturingLifecycle,
} from './AgentTester.js';
export type {
  AgentTesterConfig,
  TestLifecycleHooks,
  TestResult,
  TestExecutionConfig,
} from './AgentTester.js';

// Test Helpers
export {
  // Context factories
  createExecutionContext,
  createTestSession,
  // Agent factories
  createTestAgent,
  createEchoAgent,
  createDelayAgent,
  createFailingAgent,
  // Config factories
  createTestConfig,
  createRetryConfig,
  createTimeoutConfig,
  // Timing utilities
  wait,
  measureTime,
  withTimeout,
  // Batch testing
  repeatTest,
  runInParallel,
  // Promise utilities
  expectToReject,
  expectToResolve,
  // Result utilities
  unwrapSuccess,
  unwrapOr,
  // Trace utilities
  expectTraceSteps,
  findTraceStepByType,
  countTraceStepsByType,
} from './testHelpers.js';
export type {
  ExecutionContextOptions,
  TestSession,
  MeasuredResult,
} from './testHelpers.js';

// Assertions
export {
  // Status assertions
  expectSuccess,
  expectPartial,
  expectFailure,
  // Value assertions
  expectValue,
  expectValueMatches,
  expectValueSatisfies,
  // Warning assertions
  expectWarning,
  expectWarnings,
  expectNoWarnings,
  // Metadata assertions
  expectModel,
  expectTokensUsed,
  expectCostWithinBudget,
  expectDuration,
  // Error assertions
  expectError,
  expectErrorMessage,
  // Combined assertions
  expectSuccessWithValue,
  expectPartialWithWarning,
} from './assertions.js';

// ToolTester
export {
  ToolTester,
  expectToolSuccess,
  expectToolFailure,
  expectToolData,
  expectToolError,
  expectToolDuration,
  createToolContext,
} from './ToolTester.js';
export type {
  ToolTestResult,
} from './ToolTester.js';

// MemoryTester
export {
  MemoryTester,
  createTestMemoryEntry,
  createTestMemoryEntries,
  createTestMemoryEntriesWithVaryingImportance,
} from './MemoryTester.js';
export type {
  TestMemoryEntry,
} from './MemoryTester.js';
