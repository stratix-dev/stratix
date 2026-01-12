import { Command } from '@stratix/framework';

@Command()
export class CreateUserCommand {
  constructor(
    public readonly username: string,
    public readonly email: string
  ) {}
}
