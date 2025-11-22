# Stratix Copilot

**AI-powered coding assistant for Stratix framework** - Generate DDD/CQRS code with intelligent, context-aware suggestions.

[![VS Code](https://img.shields.io/badge/VS%20Code-1.85%2B-blue)](https://code.visualstudio.com/)
[![GitHub Copilot](https://img.shields.io/badge/GitHub%20Copilot-Required-green)](https://github.com/features/copilot)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## What is Stratix Copilot?

Stratix Copilot is a VS Code extension that enhances GitHub Copilot with deep knowledge of the Stratix framework. It uses **Retrieval Augmented Generation (RAG)** to provide accurate, framework-specific code generation.

### Key Features

- **Context-Aware AI** - Understands your project structure (DDD/Modular)
- **Framework Knowledge** - Trained on 36+ Stratix documentation sources
- **Smart Code Generation** - Entities, commands, queries, value objects
- **Auto-Updates** - Knowledge base stays synchronized with framework
- **RAG-Enhanced** - Retrieves relevant documentation for accurate responses
- **Privacy-First** - All processing happens locally
- **No API Keys** - Uses your existing GitHub Copilot subscription

### Usage

Open Copilot Chat and use `@stratix`:

```
@stratix /entity Product with name, price, stock
@stratix /command CreateProduct with productId, name, price
@stratix /query GetProductById with productId
@stratix /vo Email with validation
@stratix how do I implement a repository?
```

## Slash Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/entity` | Generate domain entity | `@stratix /entity User with email, name` |
| `/command` | Generate CQRS command | `@stratix /command CreateUser` |
| `/query` | Generate CQRS query | `@stratix /query GetUserById` |
| `/vo` | Generate value object | `@stratix /vo Email with validation` |
| `/repository` | Generate repository | `@stratix /repository UserRepository` |
| `/context` | Generate bounded context | `@stratix /context Orders` |
| `/refactor` | Get refactoring suggestions | `@stratix /refactor [code]` |
| `/explain` | Explain concepts | `@stratix /explain aggregate roots` |

1. **Analyze** - Understands your project structure
2. **Search** - Finds relevant documentation using semantic search
3. **Enrich** - Adds Stratix patterns and examples to prompt
4. **Generate** - GitHub Copilot creates accurate code
5. **Use** - Copy generated code into your project files

## Knowledge Base

The extension includes a pre-built, versioned knowledge base:

- **36+ Documents** - Complete Stratix documentation
- **Auto-Updates** - CI/CD keeps it synchronized
- **Version Tracking** - Matches framework version
- **Local Storage** - Fast, privacy-first

### Version Information

Check your KB version:
```
Cmd+Shift+P → "Stratix: Show Knowledge Base Info"
```

Update manually:
```
Cmd+Shift+P → "Stratix: Rebuild Knowledge Base"
```

## VS Code Commands

- `Stratix: Open AI Assistant` - Open Copilot Chat
- `Stratix: Rebuild Knowledge Base` - Rebuild KB from docs
- `Stratix: Show Knowledge Base Info` - Display version & stats

## License

MIT © [P. Andrés Carvajal](https://github.com/pcarvajal)

## Support

- [Documentation](https://stratix-dev.github.io/stratix/)