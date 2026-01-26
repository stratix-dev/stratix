<div align="center">
  <img src="./logo.png" alt="Stratix Logo" width="200"/>

# Stratix

**Stratix is a modular backend framework for building scalable and maintainable systems, grounded in clean architecture and domain-driven design, with first-class support for AI agent construction and orchestration.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

</div>

<div align="center">

## ⚠️ In Active Development

</div>

## Project Structure

```text
src/
├─ app/
│  ├─ App.ts                  # HTTP, Console, etc. application entry points (can be more than one)
│  ├─ *Controller.ts          # Controllers (HTTP applications)
│  ├─ *Middleware.ts          # Middlewares (HTTP applications)
│  ├─ *Listener.ts            # Event listeners (event-driven applications)
│  ├─ *Scheduler.ts           # Scheduled tasks (scheduled applications)
│  └─ ...
│
├─ <context-name>/            # Isolated bounded context
│  ├─ application/
│  │  ├─ *Command.ts          # Command definitions
│  │  ├─ *CommandHandler.ts   # Command handlers
│  │  ├─ *Query.ts            # Query definitions
│  │  ├─ *QueryHandler.ts     # Query handlers
│  │  ├─ *Event.ts            # Domain / integration events
│  │  ├─ *EventHandler.ts     # Event handlers
│  │  └─ *UseCase.ts          # Application use cases
│  │
│  ├─ domain/
│  │  ├─ *Entity.ts           # Domain entities
│  │  ├─ *ValueObject.ts      # Value objects
│  │  ├─ *AggregateRoot.ts    # Aggregate roots
│  │  ├─ *DomainService.ts    # Domain services
│  │  └─ *Repository.ts       # Repository interfaces (ports)
│  │
│  └─ infrastructure/
│     └─ *Repository.ts       # Repository implementations (adapters)
│
├─ <other-context>/           # Another isolated context
│  └─ ...
│
└─ main.ts                    # Application bootstrap
```

## License

MIT - See [LICENSE](https://github.com/stratix-dev/stratix/blob/main/LICENSE) for details.

<div align="center">

**[Stratix Framework](https://stratixdev.com)** - Build better software

</div>
