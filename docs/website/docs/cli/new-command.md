---
sidebar_position: 2
title: new Command
description: Create new Stratix projects
---

# new Command

Create a new Stratix project with the `new` command.

## Usage

```bash
stratix new <project-name> [options]
```

## Interactive Mode

```bash
stratix new
```

You'll be prompted for:
- Project name
- Project structure (Single-Context, Multi-Context, Minimal)
- Package manager (npm, pnpm, yarn)
- Install dependencies (yes/no)

## Non-Interactive Mode

```bash
stratix new my-app --structure single-context --pm pnpm --skip-install
```

## Options

| Option                        | Alias  | Description                             | Default          |
| ----------------------------- | ------ | --------------------------------------- | ---------------- |
| `--structure <type>`          | `-s`   | Project structure                       | `single-context` |
| `--package-manager <manager>` | `--pm` | Package manager to use                  | `npm`            |
| `--with <extensions>`         |        | Extensions to install (comma-separated) | -                |
| `--skip-install`              |        | Skip dependency installation            | `false`          |
| `--skip-git`                  |        | Skip git initialization                 | `false`          |
| `--directory`                 | `-d`   | Target directory                        | `<project-name>` |

### Extension Names

When using `--with`, you can specify any of these extension names (comma-separated):

**Production:**
- `http` - Fastify HTTP server
- `validation` - Zod schema validation
- `auth` - JWT authentication & RBAC

**Database & Infrastructure:**
- `postgres` - PostgreSQL integration
- `mongodb` - MongoDB integration
- `redis` - Redis caching
- `rabbitmq` - RabbitMQ messaging
- `opentelemetry` - Observability

**AI Providers:**
- `ai-openai` - OpenAI LLM provider
- `ai-anthropic` - Anthropic Claude provider

**Configuration:**
- `config-env` - Environment variable configuration
- `config-file` - File-based configuration (JSON/YAML)
- `config-composite` - Composite configuration provider

## Structures

### Single-Context Structure (Default)

Organized by architectural layers, ideal for focused applications:

```bash
stratix new my-app --structure single-context
```

**Structure:**
```
my-app/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   └── services/
│   ├── application/
│   │   ├── commands/
│   │   └── queries/
│   ├── infrastructure/
│   │   ├── persistence/
│   │   └── http/
│   └── main.ts
├── tests/
├── package.json
└── tsconfig.json
```

### Multi-Context Structure

Multiple contexts for modular architecture:

```bash
stratix new my-app --structure multi-context
```

**Structure:**
```
my-app/
├── src/
│   ├── contexts/
│   │   ├── products/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   └── infrastructure/
│   │   └── orders/
│   │       ├── domain/
│   │       ├── application/
│   │       └── infrastructure/
│   └── main.ts
├── tests/
├── package.json
└── tsconfig.json
```

### Minimal Structure

Bare-bones setup:

```bash
stratix new my-app --structure minimal
```

**Structure:**
```
my-app/
├── src/
│   └── main.ts
├── package.json
└── tsconfig.json
```

## Examples

### Basic Usage

```bash
# Interactive mode (recommended for beginners)
stratix new

# Non-interactive with defaults
stratix new my-app

# Specify package manager
stratix new my-app --pm pnpm
```

### With Extensions

```bash
# Create project with HTTP plugin
stratix new my-api --with http

# Create project with multiple extensions
stratix new my-app --with http,postgres,validation

# Create project with AI capabilities
stratix new ai-service --with http,ai-openai,postgres
```

### Advanced Options

```bash
# Multi-context structure with extensions
stratix new enterprise-app --structure multi-context --with http,postgres,redis

# Skip git and installation
stratix new my-app --no-git --skip-install

# Complete custom setup
stratix new my-service --pm yarn --structure multi-context --with http,validation,auth
```

## What Gets Created

### Files

- `package.json` - Project metadata and dependencies
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.js` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `.gitignore` - Git ignore rules
- `README.md` - Project documentation
- `src/main.ts` - Application entry point

### Dependencies

**Core:**
- `@stratix/core` - Core framework
- `@stratix/runtime` - Application runtime

**Dev Dependencies:**
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions
- `eslint` - Linting
- `prettier` - Code formatting
- `jest` - Testing framework

## Post-Creation Steps

After creating a project:

```bash
cd my-app

# Install dependencies (if skipped)
npm install

# Add extensions
stratix add http
stratix add postgres

# Generate code
stratix generate entity Product

# Build
npm run build

# Run
npm start
```

## Best Practices

### 1. Use Single-Context Structure for Most Projects

```bash
stratix new my-app --structure single-context
```

### 2. Use Multi-Context for Microservices

```bash
stratix new my-services --structure multi-context
```

### 3. Choose Package Manager Wisely

```bash
# pnpm - Fast, efficient
stratix new my-app --pm pnpm

# npm - Standard
stratix new my-app --pm npm

# yarn - Alternative
stratix new my-app --pm yarn
```

### 4. Skip Install in CI/CD

```bash
stratix new my-app --skip-install
```

## Next Steps

- **[generate Commands](./generate-commands)** - Generate code
- **[add Command](./add-command)** - Add extensions
- **[Project Structure](../getting-started/project-structure)** - Understand structure
