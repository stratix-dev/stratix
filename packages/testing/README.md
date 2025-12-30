<div align="center">
  <img src="https://raw.githubusercontent.com/stratix-dev/stratix/main/public/logo-no-bg.png" alt="Stratix Logo" width="200"/>

# @stratix/testing

**Testing utilities and mocks for Stratix applications**

[![npm version](https://img.shields.io/npm/v/@stratix/testing.svg)](https://www.npmjs.com/package/@stratix/testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[Documentation](https://stratix-dev.github.io/docs/)

</div>

> Part of **[Stratix Framework](https://stratix-dev.github.io/docs/)** - A TypeScript framework for building scalable applications with Domain-Driven Design, Hexagonal Architecture, and CQRS patterns.
>

## ⚠️ Pre-Release Warning

**This is a pre-release version of @stratix/testing.**

This package is under active development and should be considered unstable. The API may change significantly between versions without prior notice. Features may be added, modified, or removed entirely. This package may also be deprecated or discontinued in future releases.

**Stable versions will be available starting from version 1.0.0.** Not recommended for production use. Use at your own risk.

## About This Package

`@stratix/testing` provides comprehensive testing utilities for Stratix AI agents and domain-driven architecture:

- **AgentTester** - Test AI agents with lifecycle hooks and performance measurement
- **MockLLMProvider** - Mock LLM provider for testing without API calls
- **ToolTester** - Test agent tools in isolation
- **MemoryTester** - Test memory implementations
- **Assertions** - Type-safe assertions for ExecutionResult
- **Test Helpers** - Factory functions and utilities for common testing scenarios

## About Stratix

Stratix is an AI-first TypeScript framework combining Domain-Driven Design, Hexagonal Architecture, and CQRS. It provides production-ready patterns for building scalable, maintainable applications with AI agents as first-class citizens.

**Key Resources:**
- [Documentation](https://stratix-dev.github.io/docs/)
- [Report Issues](https://github.com/stratix-dev/stratix/issues)

## Installation

**Prerequisites:**
- Node.js 18.0.0 or higher

**Installation:**
```bash
pnpm add -D @stratix/testing
```

## Quick Start

### Testing AI Agents

```typescript
import {
  AgentTester,
  MockLLMProvider,
  createExecutionContext,
  expectSuccess,
  expectValue,
} from '@stratix/testing';

describe('MyAgent', () => {
  let tester: AgentTester<string, { answer: string }>;
  let mockProvider: MockLLMProvider;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    tester = new AgentTester({ mockProvider });

    // Set mock response
    mockProvider.setResponse({
      content: JSON.stringify({ answer: 'Hello!' }),
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    });
  });

  it('should execute successfully', async () => {
    const agent = new MyAgent();
    const context = createExecutionContext();

    const { result, duration, passed } = await tester.test(
      agent,
      'test input',
      context
    );

    expect(passed).toBe(true);
    expectSuccess(result);
    expectValue(result, { answer: 'Hello!' });
    expect(duration).toBeLessThan(1000);
  });
});
```

## Core Utilities

### AgentTester

Test harness for AI agents with lifecycle hooks, tracing, and performance measurement.

```typescript
const tester = new AgentTester<TInput, TOutput>({
  timeout: 30000,
  enableTracing: true,
  mockProvider: new MockLLMProvider(),
});

const { result, duration, passed } = await tester.test(agent, input, context);
```

### MockLLMProvider

Mock LLM provider for testing without making actual API calls.

```typescript
const provider = new MockLLMProvider();

// Set single response
provider.setResponse({
  content: JSON.stringify({ result: 'success' }),
  usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
});

// Use factory methods
provider.setResponse(MockLLMProvider.jsonResponse({ data: 'value' }));
provider.setResponse(MockLLMProvider.errorResponse('Error message'));

// Check call history
provider.assertCalled(3);
provider.assertCalledWith({ model: 'gpt-4' });
```

### Assertions

Type-safe assertions for ExecutionResult:

```typescript
import {
  expectSuccess,
  expectFailure,
  expectValue,
  expectWarning,
  expectModel,
  expectTokensUsed,
} from '@stratix/testing';

expectSuccess(result); // Narrows type
expectValue(result, { answer: 'Hello!' });
expectWarning(result, 'Token limit reached');
expectModel(result, 'gpt-4');
expectTokensUsed(result, 100, 500);
```

### Test Helpers

Factory functions and utilities:

```typescript
import {
  createExecutionContext,
  createTestAgent,
  createEchoAgent,
  wait,
  measureTime,
  repeatTest,
} from '@stratix/testing';

// Create context
const context = createExecutionContext({
  userId: 'test-user-123',
  budget: 1.0,
});

// Create test agent
const agent = createTestAgent<string, string>(
  async (input) => ExecutionResult.success(input.toUpperCase(), { model: 'test' })
);

// Timing utilities
await wait(1000);
const { result, duration } = await measureTime(async () => {
  return await agent.execute(input, context);
});
```

### ToolTester

Test harness for agent tools:

```typescript
import { ToolTester, expectToolSuccess } from '@stratix/testing';

const tester = new ToolTester(new WeatherTool());

const { result, duration } = await tester.execute({ location: 'NYC' });

expectToolSuccess(result);
tester.expectValidParams({ location: 'NYC' });
tester.expectParameterProperty('location', 'string');
```

### MemoryTester

Test harness for memory implementations:

```typescript
import { MemoryTester, createTestMemoryEntries } from '@stratix/testing';

const tester = new MemoryTester(new ShortTermMemory());

await tester.populate([
  { content: 'Memory 1', importance: 0.8 },
  { content: 'Memory 2', importance: 0.5 },
]);

await tester.expectSize(2);
await tester.expectImportant(1, 0.7);
```

## Complete API

For complete API documentation, see the source files:

- [AgentTester](./src/AgentTester.ts)
- [MockLLMProvider](./src/MockLLMProvider.ts)
- [Assertions](./src/assertions.ts)
- [Test Helpers](./src/testHelpers.ts)
- [ToolTester](./src/ToolTester.ts)
- [MemoryTester](./src/MemoryTester.ts)

## License

MIT - See [LICENSE](https://github.com/stratix-dev/stratix/blob/main/LICENSE) for details.

<div align="center">

**[Stratix Framework](https://stratix-dev.github.io/stratix/)** - Build better software with proven patterns

</div>