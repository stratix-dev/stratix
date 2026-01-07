/**
 * Example 5: Complete Application with @Logger Decorator
 *
 * This is a complete, runnable example showing how the @Logger decorator
 * works in a full Stratix application with command handlers, event handlers,
 * and services.
 */

import {
  Command,
  Query,
  DomainEvent,
  Result,
  Success,
  Failure,
  DomainError,
  EntityId,
  AggregateRoot
} from '@stratix/core';
import { StratixApp, Logger, bootstrap } from '@stratix/framework';
import type { Logger as ILogger } from '@stratix/core';

// ============================================================================
// Domain Layer
// ============================================================================

// User Aggregate
class User extends AggregateRoot<'User'> {
  constructor(
    id: EntityId<'User'>,
    public email: string,
    public name: string,
    public isActive: boolean,
    createdAt: Date,
    updatedAt: Date
  ) {
    super(id, createdAt, updatedAt);
  }

  static create(email: string, name: string): User {
    const user = new User(
      EntityId.create<'User'>(),
      email,
      name,
      true,
      new Date(),
      new Date()
    );

    user.record(new UserCreatedEvent(user.id.value, email, name));

    return user;
  }

  deactivate(): void {
    this.isActive = false;
    this.touch();
    this.record(new UserDeactivatedEvent(this.id.value, this.email));
  }
}

// Domain Events
class UserCreatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string
  ) {
    super();
  }
}

class UserDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string
  ) {
    super();
  }
}

// ============================================================================
// Application Layer - Commands & Queries
// ============================================================================

class CreateUserCommand implements Command {
  constructor(
    public readonly email: string,
    public readonly name: string
  ) {}
}

class GetUserByIdQuery implements Query {
  constructor(public readonly userId: string) {}
}

// ============================================================================
// Application Layer - Command Handlers
// ============================================================================

class CreateUserHandler {
  @Logger()
  private readonly logger!: ILogger;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: CreateUserCommand): Promise<Result<User, DomainError>> {
    this.logger.info('Creating user', {
      email: command.email,
      name: command.name
    });

    // Validate email
    if (!command.email.includes('@')) {
      this.logger.warn('Invalid email format', { email: command.email });
      return Failure.create(
        new DomainError('INVALID_EMAIL', 'Email must be valid')
      );
    }

    // Check if user exists
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      this.logger.warn('User already exists', { email: command.email });
      return Failure.create(
        new DomainError('USER_EXISTS', 'User with this email already exists')
      );
    }

    // Create user
    const user = User.create(command.email, command.name);

    // Save
    await this.userRepository.save(user);

    // Publish events
    const events = user.pullDomainEvents();
    await this.eventBus.publish(events);

    this.logger.info('User created successfully', {
      userId: user.id.value,
      email: user.email
    });

    return Success.create(user);
  }
}

// ============================================================================
// Application Layer - Query Handlers
// ============================================================================

class GetUserByIdHandler {
  @Logger({ context: 'UserQueries' })
  private readonly logger!: ILogger;

  constructor(private readonly userRepository: UserRepository) {}

  async execute(query: GetUserByIdQuery): Promise<Result<User, DomainError>> {
    this.logger.debug('Fetching user by ID', { userId: query.userId });

    const user = await this.userRepository.findById(query.userId);

    if (!user) {
      this.logger.warn('User not found', { userId: query.userId });
      return Failure.create(
        new DomainError('USER_NOT_FOUND', 'User not found')
      );
    }

    this.logger.debug('User retrieved', {
      userId: user.id.value,
      email: user.email
    });

    return Success.create(user);
  }
}

// ============================================================================
// Application Layer - Event Handlers
// ============================================================================

class SendWelcomeEmailHandler {
  @Logger({ context: 'EmailNotifications' })
  private readonly logger!: ILogger;

  constructor(private readonly emailService: EmailService) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    this.logger.info('Sending welcome email', {
      userId: event.userId,
      email: event.email
    });

    try {
      await this.emailService.send({
        to: event.email,
        subject: 'Welcome!',
        body: `Hello ${event.name}, welcome to our platform!`
      });

      this.logger.info('Welcome email sent', {
        userId: event.userId,
        email: event.email
      });
    } catch (error) {
      this.logger.error('Failed to send welcome email', {
        userId: event.userId,
        email: event.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

class UpdateUserAnalyticsHandler {
  @Logger({ context: 'Analytics' })
  private readonly logger!: ILogger;

  constructor(private readonly analyticsService: AnalyticsService) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    this.logger.debug('Updating analytics', {
      eventType: 'UserCreated',
      userId: event.userId
    });

    await this.analyticsService.track({
      event: 'user_created',
      userId: event.userId,
      properties: {
        email: event.email,
        name: event.name,
        timestamp: event.occurredAt
      }
    });

    this.logger.debug('Analytics updated', {
      userId: event.userId
    });
  }
}

// ============================================================================
// Infrastructure Layer
// ============================================================================

class InMemoryUserRepository implements UserRepository {
  @Logger({ context: 'UserRepository' })
  private readonly logger!: ILogger;

  private users = new Map<string, User>();

  async save(user: User): Promise<void> {
    this.logger.debug('Saving user', { userId: user.id.value });
    this.users.set(user.id.value, user);
  }

  async findById(id: string): Promise<User | null> {
    this.logger.debug('Finding user by ID', { userId: id });
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logger.debug('Finding user by email', { email });
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }
}

class ConsoleEmailService implements EmailService {
  @Logger({ context: 'EmailService' })
  private readonly logger!: ILogger;

  async send(email: { to: string; subject: string; body: string }): Promise<void> {
    this.logger.info('Sending email', {
      to: email.to,
      subject: email.subject
    });

    // Simulate sending email
    console.log(`
      To: ${email.to}
      Subject: ${email.subject}
      Body: ${email.body}
    `);

    this.logger.debug('Email sent', { to: email.to });
  }
}

class ConsoleAnalyticsService implements AnalyticsService {
  @Logger({ context: 'AnalyticsService' })
  private readonly logger!: ILogger;

  async track(data: { event: string; userId: string; properties: any }): Promise<void> {
    this.logger.debug('Tracking event', {
      event: data.event,
      userId: data.userId
    });

    console.log('Analytics:', JSON.stringify(data, null, 2));
  }
}

// ============================================================================
// Supporting Interfaces
// ============================================================================

interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}

interface EmailService {
  send(email: { to: string; subject: string; body: string }): Promise<void>;
}

interface AnalyticsService {
  track(data: { event: string; userId: string; properties: any }): Promise<void>;
}

interface EventBus {
  publish(events: DomainEvent[]): Promise<void>;
}

// ============================================================================
// Application Bootstrap
// ============================================================================

@StratixApp({
  name: 'UserManagementApp',
  version: '1.0.0'
})
class App {
  @Logger({ context: 'Application' })
  private readonly logger!: ILogger;

  async onApplicationReady(): Promise<void> {
    this.logger.info('Application started', {
      name: 'UserManagementApp',
      version: '1.0.0'
    });
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.info('Application shutting down');
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  // Bootstrap the application
  const app = await bootstrap(App);

  console.log('Application ready!');

  // Simulate some operations
  const commandBus = app.resolve<any>('commandBus');

  // Create a user
  const createUserCommand = new CreateUserCommand(
    'john.doe@example.com',
    'John Doe'
  );

  const result = await commandBus.execute(createUserCommand);

  if (result.isSuccess) {
    console.log('User created:', result.value.id.value);
  } else {
    console.error('Failed to create user:', result.error.message);
  }

  // Shutdown
  await app.shutdown();
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { App, main };
