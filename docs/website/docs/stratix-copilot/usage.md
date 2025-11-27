---
sidebar_position: 3
---

# Usage Guide

Learn how to use Stratix Copilot to accelerate your Stratix development with AI-powered code generation.

## Basic Usage

### Opening Stratix Copilot

**Method 1: Command Palette**
```
Cmd+Shift+P → "Stratix: Open AI Assistant"
```

**Method 2: Copilot Chat**
```
Cmd+Shift+I (open Copilot Chat)
Type: @stratix
```

### Asking Questions

Simply type `@stratix` followed by your question:

```
@stratix how do I create an entity?
@stratix explain the Result pattern
@stratix show me a CQRS command example
```

## Slash Commands

Stratix Copilot provides specialized commands for common tasks:

### `/entity` - Generate Entity

Generate a domain entity with properties and methods:

```
@stratix /entity User with email, name, and createdAt
```

**Generated:**
- Complete entity class extending `Entity`
- Props interface
- Private constructor
- Static `create()` method
- Getters for all properties
- Proper imports from `@stratix/core`

---

### `/command` - Generate Command

Generate a CQRS command with handler:

```
@stratix /command CreateUser with userId, email, name
```

**Generated:**
- Command DTO class
- Command handler class
- Proper CQRS structure
- Repository injection
- Error handling with Result pattern

---

### `/query` - Generate Query

Generate a CQRS query with handler:

```
@stratix /query GetUserById with userId
```

**Generated:**
- Query DTO class
- Query handler class
- Repository usage
- Result pattern for responses

---

### `/vo` - Generate Value Object

Generate a value object with validation:

```
@stratix /vo Email with validation
```

**Generated:**
- Value object class extending `ValueObject`
- Props interface
- Validation logic
- Static `create()` returning `Result<Email>`
- Equality methods

---

### `/repository` - Generate Repository

Generate repository interface and implementation:

```
@stratix /repository UserRepository
```

**Generated:**
- Repository interface
- Method signatures (findById, save, delete)
- Optional in-memory implementation

---

### `/context` - Generate Context

Generate a complete context structure:

```
@stratix /context Orders
```

**Generated:**
- Complete folder structure
- Entity, repository, commands, queries
- Infrastructure setup
- Index file with exports

---

### `/refactor` - Get Refactoring Suggestions

Analyze code and suggest DDD improvements:

```
@stratix /refactor [paste your code]
```

**Provides:**
- DDD pattern suggestions
- Value object opportunities
- CQRS improvements
- Code organization tips

---

### `/explain` - Explain Concepts

Get detailed explanations with examples:

```
@stratix /explain aggregate roots
@stratix /explain dependency injection
```

**Provides:**
- Clear definition
- Code examples from Stratix
- When to use it
- Best practices

## Working with Generated Code

After generating code, follow these steps:

1. **Review Generated Code** in chat
2. **Copy the code** from the chat response
3. **Create file** in the correct location
4. **Paste and save** the code

### Recommended File Locations

Stratix Copilot provides code that follows these conventions:

**DDD Structure:**
```
src/
├── domain/
│   ├── entities/          ← Entities
│   ├── value-objects/     ← Value Objects
│   └── repositories/      ← Repository interfaces
├── application/
│   ├── commands/          ← Commands & handlers
│   └── queries/           ← Queries & handlers
└── infrastructure/
    └── repositories/      ← Repository implementations
```

**Modular Structure:**
```
src/contexts/{context}/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   └── repositories/
├── application/
│   ├── commands/
│   └── queries/
└── infrastructure/
    └── repositories/
```

## Advanced Usage

### Context-Aware Generation

Stratix Copilot analyzes your project:

```
@stratix /entity Order
```

**Copilot knows:**
- Your project structure (DDD/Modular)
- Existing entities (User, Product, etc.)
- Installed Stratix packages
- Whether you have stratix.config.js

**Result:** Generated code matches your project conventions.

### Multi-Step Workflows

Combine commands for complete features:

```
1. @stratix /entity Product with name, price, stock
2. @stratix /vo Money for price with currency
3. @stratix /command CreateProduct
4. @stratix /query GetProductById
5. @stratix /repository ProductRepository
```

### Code Refinement

Ask follow-up questions to refine generated code:

```
@stratix add validation to ensure price is positive
@stratix add a method to check if product is in stock
@stratix add timestamps to the entity
```

## Knowledge Base Management

### View KB Information

```
Cmd+Shift+P → "Stratix: Show Knowledge Base Info"
```

Shows:
- KB version
- Document count
- Generation date
- Statistics by type

### Rebuild Knowledge Base

```
Cmd+Shift+P → "Stratix: Rebuild Knowledge Base"
```

Use when:
- KB seems outdated
- After Stratix framework update
- Troubleshooting issues

## Tips & Best Practices

### 1. Be Specific

❌ Bad: `@stratix create entity`
✅ Good: `@stratix /entity Product with name, price, and category`

### 2. Use Slash Commands

Slash commands provide better context and more accurate results.

### 3. Review Generated Code

Always review generated code before saving. Stratix Copilot is smart but not perfect.

### 4. Iterate

Don't hesitate to ask follow-up questions to refine the code.

### 5. Check References

Copilot shows source references - review them for deeper understanding.

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Copilot Chat | `Cmd+Shift+I` |
| Open Command Palette | `Cmd+Shift+P` |
| Open Stratix Assistant | `Cmd+Shift+P` → "Stratix: Open" |

## Next Steps

- [Commands Reference](./commands.md) - Complete command list
- [Examples](./examples.md) - Real-world usage examples
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
