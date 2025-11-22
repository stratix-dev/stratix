<div align="center">
  <img src="https://raw.githubusercontent.com/stratix-dev/stratix/main/public/logo-no-bg.png" alt="Stratix Logo" width="200"/>

# @stratix/testing

**Testing utilities and mocks for Stratix applications**

[![npm version](https://img.shields.io/npm/v/@stratix/testing.svg)](https://www.npmjs.com/package/@stratix/testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[Documentation](https://stratix-dev.github.io/stratix/) | [Getting Started](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start)

</div>

-

> Part of **[Stratix Framework](https://stratix-dev.github.io/stratix/)** - A TypeScript framework for building scalable applications with Domain-Driven Design, Hexagonal Architecture, and CQRS patterns.
>
> **New to Stratix?** Start with the [Getting Started Guide](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start)

-

## About This Package

`@stratix/testing` provides testing utilities, mocks, and helpers for testing Stratix applications and AI agents.

**This package includes:**
- MockLLMProvider for deterministic AI agent testing
- In-memory repository implementations
- Test data builders
- CQRS testing utilities

## About Stratix

Stratix is an AI-first TypeScript framework combining Domain-Driven Design, Hexagonal Architecture, and CQRS. It provides production-ready patterns for building scalable, maintainable applications with AI agents as first-class citizens.

**Key Resources:**
- [Documentation](https://stratix-dev.github.io/stratix/)
- [Quick Start](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start)
- [Report Issues](https://github.com/stratix-dev/stratix/issues)

## Installation

**Prerequisites:**
- Node.js 18.0.0 or higher
- `@stratix/core` installed

```bash
npm install --save-dev @stratix/testing
```

## Quick Start

```typescript
import { MockLLMProvider } from '@stratix/testing';
import { MyAgent } from './my-agent';

describe('MyAgent', () => {
  it('should process input correctly', async () => {
    const mockProvider = new MockLLMProvider({
      responses: [{ content: 'Expected response', usage: { totalTokens: 10, cost: 0.001 } }]
    });
    
    const agent = new MyAgent(mockProvider);
    const result = await agent.run('test input');
    
    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe('Expected response');
  });
});
```

## Related Packages

**Essential:**
- [`@stratix/core`](https://www.npmjs.com/package/@stratix/core) - Core primitives and abstractions
- [`@stratix/runtime`](https://www.npmjs.com/package/@stratix/runtime) - Application runtime

**AI Testing:**
- [`@stratix/ai-openai`](https://www.npmjs.com/package/@stratix/ai-openai) - OpenAI LLM provider
- [`@stratix/ai-anthropic`](https://www.npmjs.com/package/@stratix/ai-anthropic) - Anthropic Claude provider

## Documentation

- [Getting Started](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start)
- [Core Concepts](https://stratix-dev.github.io/stratix/docs/core-concepts/architecture-overview)
- [Plugin Architecture](https://stratix-dev.github.io/stratix/docs/plugins/plugin-architecture)
- [Complete Documentation](https://stratix-dev.github.io/stratix/)

## Support

- [GitHub Issues](https://github.com/stratix-dev/stratix/issues)
- [Documentation](https://stratix-dev.github.io/stratix/)

## License

MIT - See [LICENSE](https://github.com/stratix-dev/stratix/blob/main/LICENSE) for details.

-

<div align="center">

**[Stratix Framework](https://stratix-dev.github.io/stratix/)** - Build better software with proven patterns

</div>
