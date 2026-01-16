import { Command } from '@stratix/core';

export class DeleteUserCommand implements Command {
  constructor(public readonly email: string) {}
}
