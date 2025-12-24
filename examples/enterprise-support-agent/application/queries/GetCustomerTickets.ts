import { type Query, type QueryHandler, Success, Failure, type Result } from '@stratix/core';
import type { SupportTicket } from '../../domain/types.js';
import type { TicketRepository } from '../../infrastructure/repositories/TicketRepository.js';

export interface GetCustomerTicketsQuery extends Query {
  readonly customerId: string;
  readonly limit?: number;
  readonly status?: 'open' | 'in_progress' | 'waiting_customer' | 'waiting_internal' | 'resolved' | 'closed';
}

/**
 * Query handler for retrieving customer's support tickets
 */
export class GetCustomerTicketsHandler
  implements QueryHandler<GetCustomerTicketsQuery, Result<SupportTicket[], Error>>
{
  constructor(private readonly ticketRepository: TicketRepository) {}

  async handle(query: GetCustomerTicketsQuery): Promise<Result<SupportTicket[], Error>> {
    try {
      const tickets = await this.ticketRepository.findByCustomerId(
        query.customerId,
        {
          status: query.status,
          limit: query.limit || 10,
        }
      );

      return Success.create(tickets);
    } catch (error) {
      return Failure.create(
        new Error(`Failed to retrieve customer tickets: ${(error as Error).message}`)
      );
    }
  }
}