import { AgentTool, type ToolDefinition } from '@stratix/core';

interface CreateTicketInput {
  priority: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  details: string;
}

interface CreateTicketResult {
  success: boolean;
  ticketId: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  message: string;
}

/**
 * Tool for creating support tickets
 */
export class CreateSupportTicketTool extends AgentTool<
  CreateTicketInput,
  CreateTicketResult
> {
  readonly name = 'create_support_ticket';
  readonly description =
    'Create a support ticket for complex issues requiring human intervention';
  readonly requiresApproval = false;

  private ticketCounter = 1000;
  private tickets: Map<string, CreateTicketResult> = new Map();

  async execute(input: CreateTicketInput): Promise<CreateTicketResult> {
    const ticketId = `TKT-${++this.ticketCounter}`;
    const createdAt = new Date().toISOString();

    const ticket: CreateTicketResult = {
      success: true,
      ticketId,
      status: 'open',
      createdAt,
      message: `Support ticket ${ticketId} has been created and assigned to our team. You will receive a follow-up within the next business day.`,
    };

    this.tickets.set(ticketId, ticket);

    // Log ticket creation (in production, this would integrate with a ticketing system)
    console.log(`[TICKET CREATED] ${ticketId}`);
    console.log(`Priority: ${input.priority}`);
    console.log(`Summary: ${input.summary}`);
    console.log(`Details: ${input.details}`);
    console.log(`Created: ${createdAt}`);

    return ticket;
  }

  async validate(input: unknown): Promise<CreateTicketInput> {
    if (typeof input !== 'object' || input === null) {
      throw new Error('Input must be an object');
    }

    const obj = input as Record<string, unknown>;

    if (!['low', 'medium', 'high', 'critical'].includes(obj.priority as string)) {
      throw new Error('priority must be one of: low, medium, high, critical');
    }

    if (typeof obj.summary !== 'string' || obj.summary.length === 0) {
      throw new Error('summary must be a non-empty string');
    }

    if (typeof obj.details !== 'string' || obj.details.length === 0) {
      throw new Error('details must be a non-empty string');
    }

    return {
      priority: obj.priority as CreateTicketInput['priority'],
      summary: obj.summary,
      details: obj.details,
    };
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Ticket priority level',
          },
          summary: {
            type: 'string',
            description: 'Brief summary of the issue',
          },
          details: {
            type: 'string',
            description: 'Detailed description of the issue',
          },
        },
        required: ['priority', 'summary', 'details'],
      },
    };
  }
}
