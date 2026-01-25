<div align="center">
  <img src="./logo.png" alt="Stratix Logo" width="200"/>

# Stratix

**Backend AI-First TypeScript Framework for Enterprise Applications**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

</div>
<div align="center">
## ⚠️ Pre-Release Warning

**This is a pre-release version of Stratix.**

This package is under active development and should be considered unstable. The API may change significantly between versions without prior notice. Features may be added, modified, or removed entirely. This package may also be deprecated or discontinued in future releases.

**Stable versions will be available starting from version 1.0.0.** Not recommended for production use. Use at your own risk.

</div>

```
src/
	app/
		App.ts - HTTP, Console ... application entry point, maybe more than one
		 *Controller.ts - Controllers (for HTTP applications)
	   *Middleware.ts - Middlewares (for HTTP applications)
     *Listener.ts - Event listeners (for event-driven applications)
     *Scheduler.ts - Scheduled tasks (for scheduled applications)
     ...
  <context-name> isolated context folder
  application/
     *Command.ts - Command classes
     *CommandHandler.ts - Command handler classes
	   *Query.ts - Query classes
     *QueryHandler.ts - Query handler classes
	   *Event.ts - Event classes
     *EventHandler.ts - Event handler classes
     *UseCase.ts - Use case classes
	domain/
     *Entity.ts - Domain entity classes
     *ValueObject.ts - Domain value object classes
     *AggregateRoot.ts - Domain aggregate root classes
     *DomainService.ts - Domain service classes
     *Repository.ts - Repository interfaces
	infrastructure/
     *Repository.ts - Repository implementations
  <other-context> isolated context folder
    ...
 * main.ts - application bootstrap file
```

## License

MIT - See [LICENSE](https://github.com/stratix-dev/stratix/blob/main/LICENSE) for details.

<div align="center">

**[Stratix Framework](https://stratixdev.com)** - Build better software

</div>
