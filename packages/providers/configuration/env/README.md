<div align="center">
  <img src="https://raw.githubusercontent.com/stratix-dev/stratix/main/public/logo-no-bg.png" alt="Stratix Logo" width="200"/>

# @stratix/config-env

**🔧 Provider** | Environment variable configuration provider for Stratix

[![npm version](https://img.shields.io/npm/v/@stratix/config-env.svg)](https://www.npmjs.com/package/@stratix/config-env)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[Documentation](https://stratix-dev.github.io/stratix/docs/configuration/env-provider) | [Getting Started](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start)

</div>

> Part of **[Stratix Framework](https://stratix-dev.github.io/stratix/)** - A TypeScript framework for building scalable applications with Domain-Driven Design, Hexagonal Architecture, and CQRS patterns.
>
> **New to Stratix?** Start with the [Getting Started Guide](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start)

## About This Package

`@stratix/config-env` is a configuration provider for the Stratix framework.

Environment variable-based configuration with automatic type transformation and .env file support. Perfect for production deployments, containerized environments, and 12-factor applications.

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
stratix add config-env
```

**Manual installation:**
```bash
npm install @stratix/config-env
```

## Quick Start

```typescript
import { ApplicationBuilder } from '@stratix/runtime';
import { EnvConfigProvider } from '@stratix/config-env';

// Environment variables:
// APP_PORT=3000
// APP_HOST=localhost
// APP_DATABASE__URL=postgresql://localhost:5432/mydb

const config = new EnvConfigProvider({
  prefix: 'APP_',
  autoTransform: true,
});

const app = await ApplicationBuilder.create()
  .useConfig(config)
  .useContainer(container)
  .build();

// Access configuration
const port = await config.getRequired<number>('port'); // 3000
const dbUrl = await config.get<string>('database.url');
```

## Related Packages

**Essential:**
- [`@stratix/core`](https://www.npmjs.com/package/@stratix/core) - Core primitives and abstractions
- [`@stratix/runtime`](https://www.npmjs.com/package/@stratix/runtime) - Application runtime and plugin system
- [`@stratix/cli`](https://www.npmjs.com/package/@stratix/cli) - Code generation and scaffolding

**Configuration:**
- [`@stratix/config-file`](https://www.npmjs.com/package/@stratix/config-file) - File-based configuration (JSON/YAML)
- [`@stratix/config-composite`](https://www.npmjs.com/package/@stratix/config-composite) - Combine multiple configuration sources

[View all plugins](https://stratix-dev.github.io/stratix/docs/plugins/official-plugins)

## Documentation

- [EnvConfigProvider Guide](https://stratix-dev.github.io/stratix/docs/configuration/env-provider) - Complete documentation
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
