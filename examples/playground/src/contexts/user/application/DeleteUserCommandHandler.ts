import { CommandHandler } from '@stratix/framework';
import { DeleteUserCommand } from './DeleteUserCommand.js';

@CommandHandler({ command: DeleteUserCommand })
export class DeleteUserCommandHandler {
  async handle(command: DeleteUserCommand): Promise<void> {
    console.log(`Deleting user with email: ${command.email}`);
  }
}
