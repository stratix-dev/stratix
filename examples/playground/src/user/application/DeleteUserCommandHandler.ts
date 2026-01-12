import { CommandHandler } from '@stratix/framework';
import { DeleteUserCommand } from './DeleteUserCommand.js';

@CommandHandler({ commandClass: DeleteUserCommand })
export class DeleteUserCommandHandler {
  execute(command: DeleteUserCommand) {
    console.log(`Deleting user with email: ${command.email}`);
  }
}
