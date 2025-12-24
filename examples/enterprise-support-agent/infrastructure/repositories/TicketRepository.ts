import type { Repository } from '@stratix/core';
import type { SupportTicket, TicketStatus } from '../../domain/types.js';

/**
 * Repository interface for support tickets
 */
export interface TicketRepository extends Repository<SupportTicket> {
  findById(id: string): Promise<SupportTicket | null>;
  findByCustomerId(customerId: string, options?: FindOptions): Promise<SupportTicket[]>;
  save(ticket: SupportTicket): Promise<void>;
  update(ticket: SupportTicket): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface FindOptions {
  status?: TicketStatus;
  limit?: number;
  offset?: number;
}

/**
 * In-memory implementation of TicketRepository
 * In production, this would use a real database
 */
export class InMemoryTicketRepository implements TicketRepository {
  private tickets: Map<string, SupportTicket> = new Map();

  async findById(id: string): Promise<SupportTicket | null> {
    return this.tickets.get(id) || null;
  }

  async findByCustomerId(customerId: string, options?: FindOptions): Promise<SupportTicket[]> {
    let tickets = Array.from(this.tickets.values()).filter(
      ticket => ticket.customerId === customerId
    );

    // Apply status filter if provided
    if (options?.status) {
      tickets = tickets.filter(ticket => ticket.status === options.status);
    }

    // Sort by creation date (newest first)
    tickets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 10;
    tickets = tickets.slice(offset, offset + limit);

    return tickets;
  }

  async save(ticket: SupportTicket): Promise<void> {
    this.tickets.set(ticket.id, { ...ticket });
  }

  async update(ticket: SupportTicket): Promise<void> {
    if (!this.tickets.has(ticket.id)) {
      throw new Error(`Ticket ${ticket.id} not found`);
    }
    this.tickets.set(ticket.id, { ...ticket, updatedAt: new Date() });
  }

  async delete(id: string): Promise<void> {
    this.tickets.delete(id);
  }

  // Additional helper methods for testing/demo
  async count(): Promise<number> {
    return this.tickets.size;
  }

  async clear(): Promise<void> {
    this.tickets.clear();
  }

  async findAll(): Promise<SupportTicket[]> {
    return Array.from(this.tickets.values());
  }
}