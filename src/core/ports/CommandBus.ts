export interface Command {}

export interface CommandHandler<TCommand extends Command, TResult = void> {
  handle(command: TCommand): Promise<TResult>;
}

export interface CommandBus {
  dispatch<TResult = void>(command: Command): Promise<TResult>;
}
