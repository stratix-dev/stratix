# stratix-app

A Stratix application built with Domain-Driven Design, CQRS, and hexagonal architecture.

## Getting Started

```bash
# Development mode
npm run dev

# Build
npm run build

# Start production
npm start
```

## Generate Components

```bash
# Generate a new bounded context
stratix generate context Product

# Generate an AI agent
stratix generate agent CustomerSupport --provider openai
```

## Project Structure

```
src/
├── index.ts              # Application entry point
└── contexts/             # Bounded contexts
    └── <Context>/
        ├── <Context>Context.ts
        ├── domain/
        │   ├── entities/
        │   ├── value-objects/
        │   └── events/
        ├── application/
        │   ├── commands/
        │   └── queries/
        └── infrastructure/
            └── repositories/
```

## Learn More

- [Stratix Documentation](https://stratix-dev.github.io/stratix/)
- [API Reference](https://stratix-dev.github.io/stratix/)
