export class CreateUserCommand {
  constructor(
    private readonly name: string,
    private readonly email: string
  ) {}
}
