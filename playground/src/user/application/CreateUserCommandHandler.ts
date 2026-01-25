import { CreateUserCommand } from './CreateUserCommand.js';

export class CreateUserCommandHandler {
  constructor() {}

  handle(command: CreateUserCommand): void {
    console.log(`Creating user: ${command['name']} with email: ${command['email']}`);
  }
}
