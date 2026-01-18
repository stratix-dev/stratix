/**
 * Marker interface for queries in CQRS.
 *
 * Queries represent requests for data without changing state.
 * They should be named as questions or data requests (GetUser, FindOrders, ListProducts).
 *
 * @example
 * ```TypeScript
 * interface GetUserQuery extends Query {
 *   userId: string;
 * }
 *
 * interface FindOrdersQuery extends Query {
 *   customerId: string;
 *   status?: OrderStatus;
 * }
 * ```
 *
 * @category Messaging (CQRS)
 */
export interface Query {}
