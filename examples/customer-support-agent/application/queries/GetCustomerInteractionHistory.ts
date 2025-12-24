import { type Query, type QueryHandler, Success, type Result } from '@stratix/core';

export interface CustomerInteraction {
  timestamp: Date;
  inquiry: string;
  response: string;
  category: string;
  escalated: boolean;
}

export interface GetCustomerInteractionHistoryQuery extends Query {
  readonly customerId: string;
  readonly limit: number;
}

/**
 * Simple in-memory interaction history store
 * In production, this would be a proper database/event store
 */
export class InteractionHistoryService {
  private history: Map<string, CustomerInteraction[]> = new Map();

  record(customerId: string, interaction: CustomerInteraction): void {
    const existing = this.history.get(customerId) || [];
    existing.push(interaction);
    this.history.set(customerId, existing);
  }

  get(customerId: string, limit: number = 10): CustomerInteraction[] {
    const interactions = this.history.get(customerId) || [];
    return interactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  clear(customerId: string): void {
    this.history.delete(customerId);
  }
}

export class GetCustomerInteractionHistoryHandler
  implements
    QueryHandler<GetCustomerInteractionHistoryQuery, Result<CustomerInteraction[], Error>>
{
  constructor(private readonly historyService: InteractionHistoryService) {}

  async handle(
    query: GetCustomerInteractionHistoryQuery
  ): Promise<Result<CustomerInteraction[], Error>> {
    try {
      const interactions = this.historyService.get(query.customerId, query.limit);
      return Success.create(interactions);
    } catch (error) {
      return Success.create([]); // Return empty array on error instead of failing
    }
  }
}
