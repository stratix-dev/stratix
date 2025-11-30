<div align="center">
  <img src="https://raw.githubusercontent.com/stratix-dev/stratix/main/public/logo-no-bg.png" alt="Stratix Logo" width="200"/>

# @stratix/config-file

**🔧 Provider** | File-based configuration provider for Stratix

[![npm version](https://img.shields.io/npm/v/@stratix/config-file.svg)](https://www.npmjs.com/package/@stratix/config-file)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[Documentation](https://stratix-dev.github.io/stratix/docs/configuration/file-provider) | [Getting Started](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start)

</div>

> Part of **[Stratix Framework](https://stratix-dev.github.io/stratix/)** - A TypeScript framework for building scalable applications with Domain-Driven Design, Hexagonal Architecture, and CQRS patterns.
>
> **New to Stratix?** Start with the [Getting Started Guide](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start)

## About This Package

`@stratix/config-file` is a configuration provider for the Stratix framework.

File-based configuration supporting JSON and YAML with hot reload and multi-file merging. Perfect for development environments, multi-environment configurations, and version-controlled settings.

## About Stratix

Stratix is an AI-first TypeScript framework combining Domain-Driven Design, Hexagonal Architecture, and CQRS. It provides production-ready patterns for building scalable, maintainable applications with AI agents as first-class citizens.

**Key Resources:**
- [Documentation](https://stratix-dev.github.io/stratix/)
- [Quick Start](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start)
- [Report Issues](https://github.com/stratix-dev/stratix/issues)

## Installation

**Prerequisites:**
- Node.js 18.0.0 or higher
- `@stratix/core` and `@stratix/runtime` installed
- Basic understanding of [Stratix architecture](https://stratix-dev.github.io/stratix/docs/core-concepts/architecture-overview)

**Recommended:** Use the Stratix CLI
```bash
stratix add config-file
```

**Manual installation:**
```bash
npm install @stratix/config-file
```

## Quick Start

```typescript
import { ApplicationBuilder } from '@stratix/runtime';
import { FileConfigProvider } from '@stratix/config-file';

const nodeEnv = process.env.NODE_ENV || 'development';

const config = new FileConfigProvider({
  files: [
    './config/default.json',
    `./config/${nodeEnv}.json`,
  ],
  watch: true, // Enable hot reload
});

const app = await ApplicationBuilder.create()
  .useConfig(config)
  .useContainer(container)
  .build();

// Access configuration
const port = await config.getRequired<number>('server.port');
const dbConfig = await config.getNamespace('database');
```

## Related Packages

**Essential:**
- [`@stratix/core`](https://www.npmjs.com/package/@stratix/core) - Core primitives and abstractions
- [`@stratix/runtime`](https://www.npmjs.com/package/@stratix/runtime) - Application runtime and plugin system
- [`@stratix/cli`](https://www.npmjs.com/package/@stratix/cli) - Code generation and scaffolding

**Configuration:**
- [`@stratix/config-env`](https://www.npmjs.com/package/@stratix/config-env) - Environment variable configuration
- [`@stratix/config-composite`](https://www.npmjs.com/package/@stratix/config-composite) - Combine multiple configuration sources

[View all plugins](https://stratix-dev.github.io/stratix/docs/plugins/official-plugins)

## Documentation

- [FileConfigProvider Guide](https://stratix-dev.github.io/stratix/docs/configuration/file-provider) - Complete documentation
- [Configuration Overview](https://stratix-dev.github.io/stratix/docs/configuration/overview) - Configuration system
- [Validation Guide](https://stratix-dev.github.io/stratix/docs/configuration/validation) - Schema validation
- [Best Practices](https://stratix-dev.github.io/stratix/docs/configuration/best-practices) - Production patterns

## Support

- [GitHub Issues](https://github.com/stratix-dev/stratix/issues) - Report bugs and request features
- [Documentation](https://stratix-dev.github.io/stratix/) - Comprehensive guides and tutorials

## License

MIT - See [LICENSE](https://github.com/stratix-dev/stratix/blob/main/LICENSE) for details.

<div align="center">

**[Stratix Framework](https://stratix-dev.github.io/stratix/)** - Build better software with proven patterns

</div>
