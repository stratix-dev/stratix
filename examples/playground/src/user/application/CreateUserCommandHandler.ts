import { CommandHandler } from '@stratix/framework';
import { CreateUserCommand } from './CreateUserCommand.js';

@CommandHandler({ commandType: CreateUserCommand })
export class CreateUserHandler {
  execute(command: CreateUserCommand) {
    console.log(`Creating user: ${command.username} with email: ${command.email}`);
  }
}
