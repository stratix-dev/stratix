import { describe, it, expect, vi } from 'vitest';
import { BaseCommandHandler, BaseQueryHandler } from '../BaseHandlers.js';
import { Command } from '../Command.js';
import { Query } from '../Query.js';
import { Success, Failure } from '../../result/Result.js';
import { DomainError } from '../../errors/DomainError.js';

// Test command
class TestCommand implements Command {
  constructor(
    public readonly name: string,
    public readonly value: number
  ) {}
}

// Test query
class TestQuery implements Query {
  constructor(public readonly id: string) {}
}

// Test result type
interface TestResult {
  id: string;
  message: string;
}

describe('BaseCommandHandler', () => {
  describe('handle', () => {
    it('should execute command successfully', async () => {
      class TestHandler extends BaseCommandHandler<TestCommand, TestResult> {
        protected async execute(command: TestCommand) {
          return Success.create<TestResult>({
            id: '123',
            message: `Processed: ${command.name}`
          });
        }
      }

      const handler = new TestHandler();
      const command = new TestCommand('test', 42);
      const result = await handler.handle(command);

      expect(result).toEqual({
        id: '123',
        message: 'Processed: test'
      });
    });

    it('should throw error on validation failure', async () => {
      class TestHandler extends BaseCommandHandler<TestCommand, TestResult> {
        protected validate(command: TestCommand) {
          if (!command.name) {
            return Failure.create(new DomainError('INVALID_NAME', 'Name is required'));
          }
          return Success.create(undefined);
        }

        protected async execute(command: TestCommand) {
          return Success.create<TestResult>({
            id: '123',
            message: command.name
          });
        }
      }

      const handler = new TestHandler();
      const command = new TestCommand('', 42);

      await expect(handler.handle(command)).rejects.toThrow('Name is required');
    });

    it('should throw error on execution failure', async () => {
      class TestHandler extends BaseCommandHandler<TestCommand, TestResult> {
        protected async execute(_command: TestCommand) {
          return Failure.create(new DomainError('EXECUTION_FAILED', 'Command execution failed'));
        }
      }

      const handler = new TestHandler();
      const command = new TestCommand('test', 42);

      await expect(handler.handle(command)).rejects.toThrow('Command execution failed');
    });

    it('should run validation before execution', async () => {
      const executionOrder: string[] = [];

      class TestHandler extends BaseCommandHandler<TestCommand, TestResult> {
        protected validate(_command: TestCommand) {
          executionOrder.push('validate');
          return Success.create(undefined);
        }

        protected async execute(command: TestCommand) {
          executionOrder.push('execute');
          return Success.create<TestResult>({
            id: '123',
            message: command.name
          });
        }
      }

      const handler = new TestHandler();
      const command = new TestCommand('test', 42);
      await handler.handle(command);

      expect(executionOrder).toEqual(['validate', 'execute']);
    });

    it('should not execute if validation fails', async () => {
      const executeMock = vi.fn();

      class TestHandler extends BaseCommandHandler<TestCommand, TestResult> {
        protected validate(command: TestCommand) {
          if (command.value < 0) {
            return Failure.create(new DomainError('INVALID_VALUE', 'Value must be positive'));
          }
          return Success.create(undefined);
        }

        protected async execute(command: TestCommand) {
          executeMock();
          return Success.create<TestResult>({
            id: '123',
            message: command.name
          });
        }
      }

      const handler = new TestHandler();
      const command = new TestCommand('test', -1);

      await expect(handler.handle(command)).rejects.toThrow();
      expect(executeMock).not.toHaveBeenCalled();
    });

    it('should work with void result type', async () => {
      class TestHandler extends BaseCommandHandler<TestCommand, void> {
        protected async execute(_command: TestCommand) {
          return Success.create<void>(undefined);
        }
      }

      const handler = new TestHandler();
      const command = new TestCommand('test', 42);
      const result = await handler.handle(command);

      expect(result).toBeUndefined();
    });
  });
});

describe('BaseQueryHandler', () => {
  describe('handle', () => {
    it('should execute query successfully', async () => {
      class TestHandler extends BaseQueryHandler<TestQuery, TestResult> {
        protected async execute(query: TestQuery) {
          return Success.create<TestResult>({
            id: query.id,
            message: 'Found'
          });
        }
      }

      const handler = new TestHandler();
      const query = new TestQuery('test-id');
      const result = await handler.handle(query);

      expect(result).toEqual({
        id: 'test-id',
        message: 'Found'
      });
    });

    it('should throw error on validation failure', async () => {
      class TestHandler extends BaseQueryHandler<TestQuery, TestResult> {
        protected validate(query: TestQuery) {
          if (!query.id) {
            return Failure.create(new DomainError('INVALID_ID', 'ID is required'));
          }
          return Success.create(undefined);
        }

        protected async execute(query: TestQuery) {
          return Success.create<TestResult>({
            id: query.id,
            message: 'Found'
          });
        }
      }

      const handler = new TestHandler();
      const query = new TestQuery('');

      await expect(handler.handle(query)).rejects.toThrow('ID is required');
    });

    it('should throw error on execution failure', async () => {
      class TestHandler extends BaseQueryHandler<TestQuery, TestResult> {
        protected async execute(_query: TestQuery) {
          return Failure.create(new DomainError('NOT_FOUND', 'Resource not found'));
        }
      }

      const handler = new TestHandler();
      const query = new TestQuery('test-id');

      await expect(handler.handle(query)).rejects.toThrow('Resource not found');
    });

    it('should run validation before execution', async () => {
      const executionOrder: string[] = [];

      class TestHandler extends BaseQueryHandler<TestQuery, TestResult> {
        protected validate(_query: TestQuery) {
          executionOrder.push('validate');
          return Success.create(undefined);
        }

        protected async execute(query: TestQuery) {
          executionOrder.push('execute');
          return Success.create<TestResult>({
            id: query.id,
            message: 'Found'
          });
        }
      }

      const handler = new TestHandler();
      const query = new TestQuery('test-id');
      await handler.handle(query);

      expect(executionOrder).toEqual(['validate', 'execute']);
    });

    it('should not execute if validation fails', async () => {
      const executeMock = vi.fn();

      class TestHandler extends BaseQueryHandler<TestQuery, TestResult> {
        protected validate(query: TestQuery) {
          if (query.id.length < 3) {
            return Failure.create(new DomainError('INVALID_ID', 'ID too short'));
          }
          return Success.create(undefined);
        }

        protected async execute(query: TestQuery) {
          executeMock();
          return Success.create<TestResult>({
            id: query.id,
            message: 'Found'
          });
        }
      }

      const handler = new TestHandler();
      const query = new TestQuery('ab');

      await expect(handler.handle(query)).rejects.toThrow();
      expect(executeMock).not.toHaveBeenCalled();
    });
  });
});
