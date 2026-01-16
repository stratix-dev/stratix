import { Command } from '@stratix/core';

export class CreateUserCommand implements Command {
  constructor(
    public readonly username: string,
    public readonly email: string
  ) {}
}
