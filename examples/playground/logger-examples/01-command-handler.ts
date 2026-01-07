/**
 * Example 1: Using @Logger in a Command Handler
 *
 * This example shows how to use the @Logger decorator in a CQRS command handler.
 * The logger is automatically injected and includes the class context.
 */

import { Command, Result, Success, Failure, DomainError } from '@stratix/core';
import { Logger } from '@stratix/framework';
import type { Logger as ILogger } from '@stratix/core';

// Command definition
export class CreateUserCommand implements Command {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly age: number
  ) {}
}

// Command Handler with Logger
export class CreateUserHandler {
  // The @Logger decorator automatically injects a logger instance
  // with the class name as context
  @Logger()
  private readonly logger!: ILogger;

  constructor(
    private readonly userRepository: UserRepository
  ) {}

  async execute(command: CreateUserCommand): Promise<Result<User, DomainError>> {
    // Log at the start of the operation
    this.logger.info('Creating new user', {
      email: command.email,
      name: command.name,
      age: command.age
    });

    // Validate command
    if (!command.email || !command.email.includes('@')) {
      this.logger.warn('Invalid email provided', { email: command.email });
      return Failure.create(
        new DomainError('INVALID_EMAIL', 'Email must be valid')
      );
    }

    if (command.age < 18) {
      this.logger.warn('User must be at least 18 years old', { age: command.age });
      return Failure.create(
        new DomainError('INVALID_AGE', 'User must be at least 18 years old')
      );
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      this.logger.warn('User already exists', { email: command.email });
      return Failure.create(
        new DomainError('USER_EXISTS', 'User with this email already exists')
      );
    }

    try {
      // Create user
      const user = User.create(command.email, command.name, command.age);

      // Save to repository
      await this.userRepository.save(user);

      // Log success with relevant context
      this.logger.info('User created successfully', {
        userId: user.id,
        email: user.email
      });

      return Success.create(user);
    } catch (error) {
      // Log error with full context
      this.logger.error('Failed to create user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        command
      });

      return Failure.create(
        new DomainError('CREATE_USER_FAILED', 'Failed to create user')
      );
    }
  }
}

// Supporting classes for the example
class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly age: number
  ) {}

  static create(email: string, name: string, age: number): User {
    return new User(
      Math.random().toString(36).substring(7),
      email,
      name,
      age
    );
  }
}

interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
