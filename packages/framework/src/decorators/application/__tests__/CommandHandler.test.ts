import { describe, it, expect, beforeEach } from 'vitest';
import { Command } from '../Command.js';
import { CommandHandler } from '../CommandHandler.js';
import { MetadataStorage } from '../../../runtime/MetadataStorage.js';

describe('@Command and @CommandHandler Decorators', () => {
  beforeEach(() => {
    MetadataStorage['commands'] = new Map();
    MetadataStorage['commandHandlers'] = new Map();
  });

  describe('@Command Decorator', () => {
    it('should register command metadata', () => {
      @Command()
      class TestCommand {
        constructor(public readonly value: string) {}
      }

      const metadata = MetadataStorage.getCommand(TestCommand);

      expect(metadata).toBeDefined();
      expect(metadata?.target).toBe(TestCommand);
    });

    it('should support multiple commands', () => {
      @Command()
      class Command1 {
        constructor(public readonly value: string) {}
      }

      @Command()
      class Command2 {
        constructor(public readonly value: number) {}
      }

      const metadata1 = MetadataStorage.getCommand(Command1);
      const metadata2 = MetadataStorage.getCommand(Command2);

      expect(metadata1).toBeDefined();
      expect(metadata2).toBeDefined();
      expect(metadata1?.target).toBe(Command1);
      expect(metadata2?.target).toBe(Command2);
    });
  });

  describe('@CommandHandler Decorator', () => {
    it('should register command handler metadata', () => {
      @Command()
      class TestCommand {
        constructor(public readonly value: string) {}
      }

      @CommandHandler(TestCommand)
      class TestCommandHandler {
        async execute(command: TestCommand): Promise<void> {
          // Handler implementation
        }
      }

      const metadata = MetadataStorage.getCommandHandler(TestCommandHandler);

      expect(metadata).toBeDefined();
      expect(metadata?.commandClass).toBe(TestCommand);
      expect(metadata?.handlerClass).toBe(TestCommandHandler);
    });

    it('should link command to handler', () => {
      @Command()
      class CreateUser {
        constructor(
          public readonly email: string,
          public readonly name: string
        ) {}
      }

      @CommandHandler(CreateUser)
      class CreateUserHandler {
        async execute(command: CreateUser): Promise<void> {
          // Create user logic
        }
      }

      const metadata = MetadataStorage.getCommandHandler(CreateUserHandler);

      expect(metadata?.commandClass).toBe(CreateUser);
      expect(metadata?.handlerClass).toBe(CreateUserHandler);
    });

    it('should retrieve all command handlers', () => {
      @Command()
      class Command1 {}

      @Command()
      class Command2 {}

      @CommandHandler(Command1)
      class Handler1 {
        async execute(cmd: Command1): Promise<void> {}
      }

      @CommandHandler(Command2)
      class Handler2 {
        async execute(cmd: Command2): Promise<void> {}
      }

      const allHandlers = MetadataStorage.getAllCommandHandlers();

      expect(allHandlers).toHaveLength(2);
      expect(allHandlers.map((h) => h.handlerClass)).toContain(Handler1);
      expect(allHandlers.map((h) => h.handlerClass)).toContain(Handler2);
    });
  });

  describe('Integration', () => {
    it('should work with complex command and handler', () => {
      @Command()
      class UpdateProductPrice {
        constructor(
          public readonly productId: string,
          public readonly newPrice: number
        ) {}
      }

      @CommandHandler(UpdateProductPrice)
      class UpdateProductPriceHandler {
        async execute(command: UpdateProductPrice): Promise<void> {
          // Validation
          if (command.newPrice < 0) {
            throw new Error('Price cannot be negative');
          }
          // Update logic
        }
      }

      const commandMetadata = MetadataStorage.getCommand(UpdateProductPrice);
      const handlerMetadata = MetadataStorage.getCommandHandler(
        UpdateProductPriceHandler
      );

      expect(commandMetadata?.target).toBe(UpdateProductPrice);
      expect(handlerMetadata?.commandClass).toBe(UpdateProductPrice);
      expect(handlerMetadata?.handlerClass).toBe(UpdateProductPriceHandler);

      // Should be able to instantiate and execute
      const command = new UpdateProductPrice('product-123', 49.99);
      const handler = new UpdateProductPriceHandler();

      expect(command.productId).toBe('product-123');
      expect(command.newPrice).toBe(49.99);
      expect(handler).toBeDefined();
    });
  });
});
