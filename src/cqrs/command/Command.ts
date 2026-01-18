/**
 * Marker interface for commands in CQRS.
 *
 * Commands represent intentions to change state in the system.
 * They should be named in imperative form (CreateUser, UpdateOrder, DeleteProduct).
 *
 * @example
 * ```TypeScript
 * interface CreateUserCommand extends Command {
 *   email: string;
 *   name: string;
 * }
 *
 * interface UpdateOrderCommand extends Command {
 *   orderId: string;
 *   status: OrderStatus;
 * }
 * ```
 *
 * @category Messaging (CQRS)
 */
export interface Command {}
