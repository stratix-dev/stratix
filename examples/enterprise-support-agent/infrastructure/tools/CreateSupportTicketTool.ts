import { AgentTool, type ToolDefinition } from '@stratix/core';
import type { SupportTicket, SupportCategory, Priority } from '../../domain/types.js';

interface CreateTicketInput {
  customerId: string;
  subject: string;
  description: string;
  category: SupportCategory;
  priority: Priority;
}

/**
 * Tool for creating support tickets in the ticketing system
 *
 * In production, this would integrate with ticketing systems like
 * Zendesk, Intercom, Freshdesk, etc.
 */
export class CreateSupportTicketTool extends AgentTool<CreateTicketInput, SupportTicket> {
  readonly name = 'create_support_ticket';
  readonly description =
    'Create a support ticket for issues that require human agent assistance or tracking';
  readonly requiresApproval = false;

  // In-memory ticket storage (for demo purposes)
  private ticketCounter = 1000;
  private tickets: Map<string, SupportTicket> = new Map();

  async execute(input: CreateTicketInput): Promise<SupportTicket> {
    const { customerId, subject, description, category, priority } = input;

    // Generate ticket ID
    const ticketId = `TKT-${String(this.ticketCounter++).padStart(6, '0')}`;

    // Determine initial assignment based on category and priority
    const assignedTo = this.determineAssignment(category, priority);

    // Create ticket
    const ticket: SupportTicket = {
      id: ticketId,
      customerId,
      subject,
      description,
      category,
      priority,
      status: 'open',
      assignedTo,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: this.generateTags(category, priority, description),
    };

    // Store ticket
    this.tickets.set(ticketId, ticket);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return ticket;
  }

  private determineAssignment(category: SupportCategory, priority: Priority): string | undefined {
    // Critical tickets go to senior support
    if (priority === 'critical') {
      return 'senior-support-team';
    }

    // Route by category
    switch (category) {
      case 'billing':
        return 'billing-team';
      case 'technical':
        return priority === 'high' ? 'senior-technical-team' : 'technical-team';
      case 'shipping':
        return 'logistics-team';
      case 'product':
        return 'product-support-team';
      case 'account':
        return 'account-team';
      case 'general':
      default:
        return 'general-support-team';
    }
  }

  private generateTags(category: SupportCategory, priority: Priority, description: string): string[] {
    const tags: string[] = [category, priority];

    // Add contextual tags based on description
    const descLower = description.toLowerCase();

    if (descLower.includes('refund')) tags.push('refund');
    if (descLower.includes('bug') || descLower.includes('error')) tags.push('bug');
    if (descLower.includes('cancel')) tags.push('cancellation');
    if (descLower.includes('upgrade')) tags.push('upgrade');
    if (descLower.includes('downgrade')) tags.push('downgrade');
    if (descLower.includes('password') || descLower.includes('login')) tags.push('authentication');
    if (descLower.includes('payment') || descLower.includes('charge')) tags.push('payment');
    if (descLower.includes('delivery') || descLower.includes('shipping')) tags.push('delivery');

    return [...new Set(tags)]; // Remove duplicates
  }

  async validate(input: unknown): Promise<CreateTicketInput> {
    if (typeof input !== 'object' || input === null) {
      throw new Error('Input must be an object');
    }

    const obj = input as Record<string, unknown>;

    // Validate customerId
    if (typeof obj.customerId !== 'string' || obj.customerId.trim().length === 0) {
      throw new Error('customerId must be a non-empty string');
    }

    // Validate subject
    if (typeof obj.subject !== 'string' || obj.subject.trim().length === 0) {
      throw new Error('subject must be a non-empty string');
    }

    if (obj.subject.length > 200) {
      throw new Error('subject must be 200 characters or less');
    }

    // Validate description
    if (typeof obj.description !== 'string' || obj.description.trim().length === 0) {
      throw new Error('description must be a non-empty string');
    }

    if (obj.description.length > 5000) {
      throw new Error('description must be 5000 characters or less');
    }

    // Validate category
    const validCategories: SupportCategory[] = [
      'billing',
      'technical',
      'shipping',
      'product',
      'account',
      'general',
    ];
    if (!validCategories.includes(obj.category as SupportCategory)) {
      throw new Error(`category must be one of: ${validCategories.join(', ')}`);
    }

    // Validate priority
    const validPriorities: Priority[] = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(obj.priority as Priority)) {
      throw new Error(`priority must be one of: ${validPriorities.join(', ')}`);
    }

    return {
      customerId: obj.customerId.trim(),
      subject: obj.subject.trim(),
      description: obj.description.trim(),
      category: obj.category as SupportCategory,
      priority: obj.priority as Priority,
    };
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          customerId: {
            type: 'string',
            description: 'ID of the customer for whom to create the ticket',
          },
          subject: {
            type: 'string',
            description: 'Brief summary of the issue (max 200 characters)',
            maxLength: 200,
          },
          description: {
            type: 'string',
            description: 'Detailed description of the issue (max 5000 characters)',
            maxLength: 5000,
          },
          category: {
            type: 'string',
            enum: ['billing', 'technical', 'shipping', 'product', 'account', 'general'],
            description: 'Category of the support issue',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Priority level of the ticket',
          },
        },
        required: ['customerId', 'subject', 'description', 'category', 'priority'],
      },
    };
  }

  // Helper method to get a ticket (useful for testing)
  getTicket(ticketId: string): SupportTicket | undefined {
    return this.tickets.get(ticketId);
  }

  // Helper method to list all tickets (useful for testing)
  listTickets(): SupportTicket[] {
    return Array.from(this.tickets.values());
  }
}
