import { CommandHandler } from '@stratix/framework';
import { CreateUserCommand } from './CreateUserCommand.js';

@CommandHandler({ commandClass: CreateUserCommand })
export class CreateUserCommandHandler {
  execute(command: CreateUserCommand) {
    console.log(`Creating user: ${command.username} with email: ${command.email}`);
  }
}
