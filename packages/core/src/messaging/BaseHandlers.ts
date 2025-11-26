import { Command } from './Command.js';
import { Query } from './Query.js';
import { CommandHandler } from './CommandHandler.js';
import { QueryHandler } from './QueryHandler.js';
import { Result, Success } from '../result/Result.js';
import { DomainError } from '../errors/DomainError.js';

/**
 * Base class for command handlers with built-in validation and error handling.
 *
 * Provides a template method pattern with hooks for validation and execution.
 * Automatically handles Result types and throws on failure.
 *
 * @template TCommand - The command type
 * @template TResult - The result type
 *
 * @example
 * ```typescript
 * class CreateProductHandler extends BaseCommandHandler<CreateProductCommand, Product> {
 *   constructor(private repository: IProductRepository) {
 *     super();
 *   }
 *
 *   protected validate(command: CreateProductCommand): Result<void, DomainError> {
 *     if (!command.name) {
 *       return Failure.create(new DomainError('INVALID_NAME', 'Name is required'));
 *     }
 *     return Success.create(undefined);
 *   }
 *
 *   protected async execute(command: CreateProductCommand): Promise<Result<Product, DomainError>> {
 *     const product = Product.create(command.name, command.price);
 *     await this.repository.save(product);
 *     return Success.create(product);
 *   }
 * }
 * ```
 */
export abstract class BaseCommandHandler<TCommand extends Command, TResult>
    implements CommandHandler<TCommand, TResult> {
    /**
     * Validates the command before handling.
     * Override this method to add custom validation logic.
     *
     * @param command - The command to validate
     * @returns Success if valid, Failure with error if invalid
     */
    protected validate(_command: TCommand): Result<void, DomainError> {
        // Default implementation: no validation
        return Success.create(undefined);
    }

    /**
     * Main handler logic. Override this method to implement the command handling.
     *
     * @param command - The command to execute
     * @returns Result with success value or domain error
     */
    protected abstract execute(
        command: TCommand
    ): Promise<Result<TResult, DomainError>>;

    /**
     * Handles the command with automatic validation and error handling.
     * This method orchestrates validation and execution.
     *
     * @param command - The command to handle
     * @returns The success value
     * @throws DomainError if validation or execution fails
     */
    async handle(command: TCommand): Promise<TResult> {
        const validation = this.validate(command);
        if (validation.isFailure) {
            throw validation.error;
        }

        const result = await this.execute(command);
        if (result.isFailure) {
            throw result.error;
        }

        return result.value;
    }
}

/**
 * Base class for query handlers with built-in validation and error handling.
 *
 * Provides a template method pattern similar to BaseCommandHandler but for queries.
 *
 * @template TQuery - The query type
 * @template TResult - The result type
 *
 * @example
 * ```typescript
 * class GetProductByIdHandler extends BaseQueryHandler<GetProductByIdQuery, Product> {
 *   constructor(private repository: IProductRepository) {
 *     super();
 *   }
 *
 *   protected validate(query: GetProductByIdQuery): Result<void, DomainError> {
 *     if (!query.productId) {
 *       return Failure.create(new DomainError('INVALID_ID', 'Product ID is required'));
 *     }
 *     return Success.create(undefined);
 *   }
 *
 *   protected async execute(query: GetProductByIdQuery): Promise<Result<Product, DomainError>> {
 *     const product = await this.repository.findById(query.productId);
 *     if (!product) {
 *       return Failure.create(new DomainError('NOT_FOUND', 'Product not found'));
 *     }
 *     return Success.create(product);
 *   }
 * }
 * ```
 */
export abstract class BaseQueryHandler<TQuery extends Query, TResult>
    implements QueryHandler<TQuery, TResult> {
    /**
     * Validates the query before handling.
     * Override this method to add custom validation logic.
     *
     * @param query - The query to validate
     * @returns Success if valid, Failure with error if invalid
     */
    protected validate(_query: TQuery): Result<void, DomainError> {
        // Default implementation: no validation
        return Success.create(undefined);
    }

    /**
     * Main handler logic. Override this method to implement the query handling.
     *
     * @param query - The query to execute
     * @returns Result with success value or domain error
     */
    protected abstract execute(query: TQuery): Promise<Result<TResult, DomainError>>;

    /**
     * Handles the query with automatic validation and error handling.
     * This method orchestrates validation and execution.
     *
     * @param query - The query to handle
     * @returns The success value
     * @throws DomainError if validation or execution fails
     */
    async handle(query: TQuery): Promise<TResult> {
        const validation = this.validate(query);
        if (validation.isFailure) {
            throw validation.error;
        }

        const result = await this.execute(query);
        if (result.isFailure) {
            throw result.error;
        }

        return result.value;
    }
}
