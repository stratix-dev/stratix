import { Command } from '../cqrs/command/Command.js';
import { CommandHandler } from '../cqrs/command/CommandHandler.js';
import { Event } from '../cqrs/event/Event.js';
import { EventHandler } from '../cqrs/event/EventHandler.js';
import { Query } from '../cqrs/query/Query.js';
import { QueryHandler } from '../cqrs/query/QueryHandler.js';

/**
 * Definition for registering a command with its handler within a context.
 *
 * @template TCommand - The command type
 * @template TResult - The result type returned by the handler
 */
export interface ContextCommandDefinition<TCommand extends Command = Command, TResult = unknown> {
  /**
   * Unique name for the command type.
   */
  readonly name: string;

  /**
   * The command class constructor.
   */
  readonly commandType: new (...args: unknown[]) => TCommand;

  /**
   * The handler instance for this command.
   */
  readonly handler: CommandHandler<TCommand, TResult>;
}

/**
 * Definition for registering a query with its handler within a context.
 *
 * @template TQuery - The query type
 * @template TResult - The result type returned by the handler
 */
export interface ContextQueryDefinition<TQuery extends Query = Query, TResult = unknown> {
  /**
   * Unique name for the query type.
   */
  readonly name: string;

  /**
   * The query class constructor.
   */
  readonly queryType: new (...args: unknown[]) => TQuery;

  /**
   * The handler instance for this query.
   */
  readonly handler: QueryHandler<TQuery, TResult>;
}

/**
 * Definition for registering an event handler within a context.
 *
 * @template TEvent - The event type
 */
export interface ContextEventHandlerDefinition<TEvent extends Event = Event> {
  /**
   * Name of the event to handle.
   */
  readonly eventName: string;

  /**
   * The event class constructor.
   */
  readonly eventType: new (...args: unknown[]) => TEvent;

  /**
   * The handler instance for this event.
   */
  readonly handler: EventHandler<TEvent>;
}

/**
 * Definition for registering a repository or service in the DI container within a context.
 */
export interface ContextRepositoryDefinition {
  /**
   * Token or name to register in the container.
   */
  readonly token: string;

  /**
   * The repository or service instance/factory.
   */
  readonly instance: unknown;

  /**
   * Whether this is a singleton (default: true).
   */
  readonly singleton?: boolean;
}
