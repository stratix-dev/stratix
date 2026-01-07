import { Command } from './Command.js';
import { CommandHandler } from './CommandHandler.js';

export interface CommandHandlerMetadata<TCommand extends Command = Command, TResult = unknown> {
  commandType: new (...args: any[]) => TCommand;
  handlerClass: new (...args: any[]) => CommandHandler<TCommand, TResult>;
}
