---
sidebar_position: 5
title: info Command
description: Display project information and diagnostics
---

# info Command

Display comprehensive information about your Stratix project.

## Usage

```bash
stratix info
```

## Output

The `info` command displays:

### Project Information

```
Project: my-app
Version: 1.0.0
Structure: Single-Context
Node: v20.10.0
Package Manager: pnpm
```

### Stratix Packages

```
@stratix/core: x.y.z
@stratix/runtime: x.y.z
@stratix/cli: x.y.z
```

### Installed Extensions

```
Extensions:
  ✓ @stratix/http-fastify (x.y.z)
  ✓ @stratix/db-postgres (x.y.z)
  ✓ @stratix/ai-openai (x.y.z)
  ✓ @stratix/di-awilix (x.y.z)
```

### Project Structure

```
Structure: Single-Context
Layers:
  ✓ Domain (src/domain)
  ✓ Application (src/application)
  ✓ Infrastructure (src/infrastructure)
```

### Statistics

```
Entities: 5
Value Objects: 8
Commands: 12
Queries: 10
Repositories: 5
```

## Options

| Option      | Description               |
| ----------- | ------------------------- |
| `--json`    | Output as JSON            |
| `--verbose` | Show detailed information |

## JSON Output

```bash
stratix info --json
```

```json
{
  "project": {
    "name": "my-app",
    "version": "1.0.0",
    "structure": "single-context"
  },
  "environment": {
    "node": "v20.10.0",
    "packageManager": "pnpm"
  },
  "stratix": {
    "core": "x.y.z",
    "runtime": "x.y.z",
    "cli": "x.y.z"
  },
  "extensions": [
    {
      "name": "@stratix/http-fastify",
      "version": "x.y.z"
    },
    {
      "name": "@stratix/db-postgres",
      "version": "x.y.z"
    }
  ],
  "statistics": {
    "entities": 5,
    "valueObjects": 8,
    "commands": 12,
    "queries": 10,
    "repositories": 5
  }
}
```

## Verbose Output

```bash
stratix info --verbose
```

Shows additional information:
- TypeScript configuration
- ESLint configuration
- Test configuration
- Build configuration
- Environment variables

## Use Cases

### 1. Debugging

```bash
stratix info --verbose > debug.txt
```

### 2. CI/CD Verification

```bash
stratix info --json | jq '.stratix.core'
```

### 3. Documentation

```bash
stratix info > PROJECT_INFO.md
```

### 4. Version Checking

```bash
stratix info | grep "@stratix/core"
```

## Troubleshooting

### Command Not Found

```bash
# Install CLI globally
npm install -g @stratix/cli

# Or use npx
npx @stratix/cli info
```

### Incorrect Information

```bash
# Clear cache and re-run
rm -rf node_modules/.cache
stratix info
```

## Next Steps

- **[CLI Overview](./cli-overview)** - All commands
- **[new Command](./new-command)** - Create projects
- **[generate Commands](./generate-commands)** - Generate code
