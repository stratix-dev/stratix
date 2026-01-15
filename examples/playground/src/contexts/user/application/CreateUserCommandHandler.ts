import { CommandHandler } from '@stratix/framework';
import { CreateUserCommand } from './CreateUserCommand.js';

@CommandHandler({ commandClass: CreateUserCommand })
export class CreateUserCommandHandler {
  async handle(command: CreateUserCommand): Promise<void> {
    console.log(`Creating user: ${command.username} with email: ${command.email}`);
  }
}
