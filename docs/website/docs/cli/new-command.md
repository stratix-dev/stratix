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

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--structure` | `-s` | Project structure | `single-context` |
| `--package-manager` | `--pm` | Package manager | `npm` |
| `--skip-install` | | Skip dependency installation | `false` |
| `--skip-git` | | Skip git initialization | `false` |
| `--directory` | `-d` | Target directory | `<project-name>` |

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

### Create with pnpm

```bash
stratix new my-app --pm pnpm
```

### Create without installing

```bash
stratix new my-app --skip-install
cd my-app
pnpm install
```

### Create in specific directory

```bash
stratix new my-app --directory ./projects/my-app
```

### Create multi-context project

```bash
stratix new my-microservices --structure multi-context
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
