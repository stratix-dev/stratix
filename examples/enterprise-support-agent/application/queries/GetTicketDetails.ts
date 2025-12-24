import { type Query, type QueryHandler, Success, Failure, type Result } from '@stratix/core';
import type { SupportTicket } from '../../domain/types.js';
import type { TicketRepository } from '../../infrastructure/repositories/TicketRepository.js';

export interface GetTicketDetailsQuery extends Query {
  readonly ticketId: string;
}

/**
 * Query handler for retrieving support ticket details
 */
export class GetTicketDetailsHandler
  implements QueryHandler<GetTicketDetailsQuery, Result<SupportTicket, Error>>
{
  constructor(private readonly ticketRepository: TicketRepository) {}

  async handle(query: GetTicketDetailsQuery): Promise<Result<SupportTicket, Error>> {
    try {
      const ticket = await this.ticketRepository.findById(query.ticketId);

      if (!ticket) {
        return Failure.create(new Error(`Ticket ${query.ticketId} not found`));
      }

      return Success.create(ticket);
    } catch (error) {
      return Failure.create(
        new Error(`Failed to retrieve ticket: ${(error as Error).message}`)
      );
    }
  }
}