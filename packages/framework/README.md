# @stratix/framework

Modern TypeScript framework for building scalable applications with Domain-Driven Design (DDD), CQRS, and AI agents - powered by decorators.

## Installation

```bash
pnpm add @stratix/framework
```

## Quick Start

```typescript
import { StratixApp, bootstrap, Module } from '@stratix/framework';

@Module({
  providers: [UserRepository]
})
export class UserModule {}

@StratixApp({
  modules: [UserModule]
})
export class App {}

// Bootstrap your application
await bootstrap(App);
```

## Features

- Decorator-based API for minimal boilerplate
- Domain-Driven Design primitives (@Aggregate, @Entity, @ValueObject)
- CQRS built-in (@Command, @Query, @CommandHandler, @QueryHandler)
- Event-driven architecture (@EventHandler, @On)
- Dependency injection with Awilix
- AI agents as first-class citizens (@Agent)
- Type-safe Result pattern
- Auto-discovery of handlers
- Production-ready from day one

## Documentation

Visit [https://stratix-dev.github.io/stratix/](https://stratix-dev.github.io/stratix/) for complete documentation.

## Example: Creating an Aggregate

```typescript
import { Aggregate, DomainEvent, Validate } from '@stratix/framework';

@Aggregate()
export class User {
  id!: EntityId<'User'>;

  @Validate(Validators.email())
  email!: Email;

  @Validate(Validators.minLength(2))
  name!: string;

  @DomainEvent('UserCreated')
  static create(email: Email, name: string): User {
    const user = new User();
    user.email = email;
    user.name = name;
    return user;
  }

  @DomainEvent('UserEmailChanged')
  changeEmail(newEmail: Email): void {
    this.email = newEmail;
  }
}
```

## Example: Command Handler

```typescript
import { Command, CommandHandler, Inject } from '@stratix/framework';

@Command()
export class CreateUser {
  constructor(
    public readonly email: string,
    public readonly name: string
  ) {}
}

@CommandHandler(CreateUser)
export class CreateUserHandler {
  constructor(@Inject() private userRepository: UserRepository) {}

  async execute(command: CreateUser): Promise<User> {
    const email = Email.create(command.email);
    const user = User.create(email, command.name);
    return this.userRepository.save(user);
  }
}
```

## Migration from @stratix/runtime

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for details on migrating from @stratix/runtime to @stratix/framework.

## License

MIT
