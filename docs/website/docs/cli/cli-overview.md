---
sidebar_position: 1
title: CLI Overview
description: Stratix CLI for project scaffolding and code generation
---

# CLI Overview

The Stratix CLI (`@stratix/cli`) is a powerful command-line tool for creating projects, generating code, and managing extensions.

**Tip**: For an even faster workflow, use [Stratix Copilot](https://marketplace.visualstudio.com/items?itemName=stratix.stratix-copilot-rag) to generate code directly in VS Code with AI assistance.

## Installation

```bash
# Global installation
npm install -g @stratix/cli

# Or use with npx
npx @stratix/cli new my-app
```

## Available Commands

| Command | Description |
|---------|-------------|
| `new` | Create a new Stratix project |
| `generate` (or `g`) | Generate code (entities, commands, queries, etc.) |
| `add` | Add extensions to your project |
| `info` | Display project information |

## Quick Start

```bash
# Create a new project
stratix new my-app

# Navigate to project
cd my-app

# Generate an entity
stratix generate entity Product

# Add an extension
stratix add http

# Display project info
stratix info
```

## Command Structure

```bash
stratix <command> [options] [arguments]
```

### Global Options

```bash
--help, -h      Show help
--version, -v   Show version
```

## Interactive Mode

Most commands support interactive mode when arguments are omitted:

```bash
# Interactive project creation
stratix new

# Interactive code generation
stratix generate

# Interactive extension installation
stratix add
```

## Non-Interactive Mode

Provide all arguments for CI/CD pipelines:

```bash
stratix new my-app --structure single-context --skip-install
stratix generate entity Product --path src/domain/entities
stratix add http --skip-install
```

## Project Templates

The CLI supports multiple project templates:

- **Single Context** (Default) - For single domain applications
- **Multi Context** - For applications with multiple domains
- **Minimal** - Bare-bones setup

```bash
stratix new my-app --structure multi-context
```

## Code Generators

Generate boilerplate code:

- **Entity** - Domain entities
- **Value Object** - Value objects
- **Command** - CQRS commands
- **Query** - CQRS queries
- **Repository** - Repository interfaces
- **Quality** - Quality checks (tests, linting)

```bash
stratix generate entity User
stratix generate command CreateUser
stratix generate query GetUserById
```

## Extension Management

Add official and third-party extensions:

```bash
# HTTP server
stratix add http

# Database
stratix add postgres

# AI providers
stratix add ai-openai
stratix add ai-anthropic
```

## Configuration

The CLI reads configuration from:

1. **Command-line flags** (highest priority)
2. **stratix.config.js** in project root
3. **package.json** `stratix` field
4. **Default values** (lowest priority)

### stratix.config.ts

```typescript
import { defineConfig } from '@stratix/cli';

export default defineConfig({
  structure: {
    type: 'single-context',
    sourceRoot: 'src',
    domainPath: 'src/domain',
    applicationPath: 'src/application',
    infrastructurePath: 'src/infrastructure',
  },
  generators: {
    entity: {
      path: 'src/domain/entities',
      aggregate: true,
      withTests: false,
    },
    command: {
      path: 'src/application/commands',
      withHandler: true,
      withTests: false,
    }
  }
});
```

## Best Practices

### 1. Use Interactive Mode for Learning

```bash
stratix new  # Learn available options
```

### 2. Use Non-Interactive for Automation

```bash
stratix new my-app --structure single-context --skip-install
```

### 3. Customize Generators

```typescript
// stratix.config.ts
import { defineConfig } from '@stratix/cli';

export default defineConfig({
  generators: {
    entity: {
      path: 'src/domain',
      aggregate: true,
      withTests: true,
    }
  }
});
```

### 4. Version Lock in CI/CD

```bash
npx @stratix/cli@0.1.3 new my-app
```

## Next Steps

- **[new Command](./new-command)** - Create projects
- **[generate Commands](./generate-commands)** - Code generation
- **[add Command](./add-command)** - Extension management
- **[info Command](./info-command)** - Project information
