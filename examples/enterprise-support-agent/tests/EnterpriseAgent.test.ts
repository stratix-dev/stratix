import { describe, it, expect, beforeEach } from 'vitest';
import { EnterpriseSupportContext } from '../EnterpriseSupportContext.js';
import type { HandleSupportRequestCommand } from '../application/commands/HandleSupportRequest.js';
import type { GetCustomerTicketsQuery } from '../application/queries/GetCustomerTickets.js';

// Mock LLM Provider for testing
class MockLLMProvider {
  name = 'mock-provider';
  models = ['gpt-4o'];

  private responses: Array<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> = [];
  private responseIndex = 0;

  addMockResponse(response: { content: string; usage: { inputTokens: number; outputTokens: number; totalTokens: number } }) {
    this.responses.push({
      content: response.content,
      usage: {
        promptTokens: response.usage.inputTokens,
        completionTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
      },
    });
  }

  async chat(): Promise<any> {
    const response = this.responses[this.responseIndex] || this.responses[this.responses.length - 1];
    this.responseIndex = (this.responseIndex + 1) % this.responses.length;
    return {
      ...response,
      finishReason: 'stop' as const,
    };
  }

  async *streamChat(): AsyncIterable<any> {
    yield { content: '', isComplete: false };
  }

  async embeddings(): Promise<any> {
    throw new Error('Embeddings not implemented in mock');
  }

  calculateCost(): number {
    return 0.001;
  }
}

describe('EnterpriseSupportAgent', () => {
  let context: EnterpriseSupportContext;
  let mockProvider: MockLLMProvider;

  beforeEach(() => {
    // Create mock LLM provider
    mockProvider = new MockLLMProvider();

    // Configure mock responses
    mockProvider.addMockResponse({
      content: JSON.stringify({
        message: 'I apologize for the inconvenience with the app crashes. Let me help you resolve this issue.',
        sentiment: {
          score: 0.2,
          label: 'neutral',
        },
        category: 'technical',
        priority: 'medium',
        requiresEscalation: false,
        suggestedActions: [
          'Clear app cache and data',
          'Update to the latest version',
          'Restart your device',
        ],
        confidence: 0.85,
        language: 'en',
        metadata: {
          knowledgeArticles: ['kb-002'],
        },
      }),
      usage: {
        inputTokens: 200,
        outputTokens: 150,
        totalTokens: 350,
      },
    });

    // Create context with mock provider
    context = new EnterpriseSupportContext(mockProvider);
  });

  describe('Support Request Handling', () => {
    it('should handle a technical support request', async () => {
      const command: HandleSupportRequestCommand = {
        request: {
          customerId: 'test-customer-001',
          message: 'My app keeps crashing when I upload photos',
          metadata: {
            accountAge: 30,
            previousTickets: 0,
            customerTier: 'free',
          },
        },
      };

      const result = await context.getSupportRequestHandler().handle(command);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.category).toBe('technical');
        expect(result.value.priority).toBe('medium');
        expect(result.value.requiresEscalation).toBe(false);
        expect(result.value.suggestedActions.length).toBeGreaterThan(0);
      }
    });

    it('should handle a billing request with escalation', async () => {
      // Create new mock provider with billing response
      const billingMockProvider = new MockLLMProvider();
      billingMockProvider.addMockResponse({
        content: JSON.stringify({
          message: 'I understand your frustration. Let me escalate this to our billing team immediately.',
          sentiment: {
            score: -0.6,
            label: 'negative',
          },
          category: 'billing',
          priority: 'high',
          requiresEscalation: true,
          suggestedActions: [
            'Escalate to billing specialist',
            'Process refund request',
            'Contact customer within 24 hours',
          ],
          confidence: 0.92,
          language: 'en',
          metadata: {
            ticketId: 'TKT-001000',
            escalationReason: 'Negative sentiment and billing dispute',
          },
        }),
        usage: {
          inputTokens: 250,
          outputTokens: 180,
          totalTokens: 430,
        },
      });

      const billingContext = new EnterpriseSupportContext(billingMockProvider as any);

      const command: HandleSupportRequestCommand = {
        request: {
          customerId: 'test-customer-002',
          message: 'This is unacceptable! I was double charged and nobody is helping me!',
          metadata: {
            accountAge: 120,
            previousTickets: 3,
            customerTier: 'premium',
          },
        },
      };

      const result = await billingContext.getSupportRequestHandler().handle(command);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.category).toBe('billing');
        expect(result.value.priority).toBe('high');
        expect(result.value.requiresEscalation).toBe(true);
        expect(result.value.sentiment.label).toBe('negative');
        expect(result.value.metadata.escalationReason).toBeDefined();
      }
    });

    it('should support multi-turn conversations', async () => {
      const command: HandleSupportRequestCommand = {
        request: {
          customerId: 'test-customer-003',
          message: 'Yes, please help me with the upgrade',
          conversationHistory: [
            {
              role: 'customer',
              content: 'I want to upgrade my plan',
              timestamp: new Date(Date.now() - 2 * 60 * 1000),
            },
            {
              role: 'agent',
              content: 'I can help you upgrade. Which plan are you interested in?',
              timestamp: new Date(Date.now() - 1 * 60 * 1000),
            },
          ],
          metadata: {
            accountAge: 45,
            previousTickets: 1,
            customerTier: 'free',
          },
        },
      };

      const result = await context.getSupportRequestHandler().handle(command);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.message).toBeDefined();
        expect(result.value.category).toBeDefined();
      }
    });
  });

  describe('Knowledge Base Tool', () => {
    it('should search knowledge base for relevant articles', async () => {
      const kbTool = context.getKnowledgeBaseTool();

      const result = await kbTool.execute({
        query: 'refund',
        category: 'billing',
      });

      expect(result.articles.length).toBeGreaterThan(0);
      expect(result.articles[0].category).toBe('billing');
      expect(result.totalFound).toBeGreaterThan(0);
    });

    it('should return relevant articles based on keywords', async () => {
      const kbTool = context.getKnowledgeBaseTool();

      const result = await kbTool.execute({
        query: 'app crash troubleshoot',
        category: 'technical',
      });

      expect(result.articles.length).toBeGreaterThan(0);
      const article = result.articles[0];
      expect(article.title).toContain('Crash');
      expect(article.relevanceScore).toBeGreaterThan(0);
    });

    it('should limit results', async () => {
      const kbTool = context.getKnowledgeBaseTool();

      const result = await kbTool.execute({
        query: 'help',
        limit: 2,
      });

      expect(result.articles.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Order Status Tool', () => {
    it('should retrieve order status', async () => {
      const orderTool = context.getOrderStatusTool();

      const result = await orderTool.execute({
        orderId: 'ORD-12345',
      });

      expect(result.orderId).toBe('ORD-12345');
      expect(result.status).toBeDefined();
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should throw error for invalid order ID', async () => {
      const orderTool = context.getOrderStatusTool();

      await expect(
        orderTool.execute({ orderId: 'ORD-99999' })
      ).rejects.toThrow('Order ORD-99999 not found');
    });

    it('should validate order ID format', async () => {
      const orderTool = context.getOrderStatusTool();

      await expect(
        orderTool.validate({ orderId: 'invalid-format' })
      ).rejects.toThrow('orderId must be in format: ORD-XXXXX');
    });
  });

  describe('Create Ticket Tool', () => {
    it('should create a support ticket', async () => {
      const ticketTool = context.getCreateTicketTool();

      const result = await ticketTool.execute({
        customerId: 'test-customer-001',
        subject: 'Refund request',
        description: 'I would like to request a refund for my recent purchase',
        category: 'billing',
        priority: 'medium',
      });

      expect(result.id).toMatch(/^TKT-\d{6}$/);
      expect(result.customerId).toBe('test-customer-001');
      expect(result.status).toBe('open');
      expect(result.assignedTo).toBe('billing-team');
      expect(result.tags).toContain('billing');
      expect(result.tags).toContain('refund');
    });

    it('should assign to senior team for critical priority', async () => {
      const ticketTool = context.getCreateTicketTool();

      const result = await ticketTool.execute({
        customerId: 'test-customer-002',
        subject: 'Critical system failure',
        description: 'System is completely down',
        category: 'technical',
        priority: 'critical',
      });

      expect(result.priority).toBe('critical');
      expect(result.assignedTo).toBe('senior-support-team');
    });

    it('should validate ticket input', async () => {
      const ticketTool = context.getCreateTicketTool();

      await expect(
        ticketTool.validate({
          customerId: '',
          subject: 'Test',
          description: 'Test',
          category: 'billing',
          priority: 'low',
        })
      ).rejects.toThrow('customerId must be a non-empty string');
    });
  });

  describe('Ticket Repository', () => {
    it('should save and retrieve tickets', async () => {
      const repo = context.getTicketRepository();
      const ticketTool = context.getCreateTicketTool();

      // Create a ticket
      const ticket = await ticketTool.execute({
        customerId: 'test-customer-001',
        subject: 'Test ticket',
        description: 'Test description',
        category: 'general',
        priority: 'low',
      });

      // Save to repository
      await repo.save(ticket);

      // Retrieve it
      const retrieved = await repo.findById(ticket.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(ticket.id);
      expect(retrieved?.customerId).toBe('test-customer-001');
    });

    it('should find tickets by customer ID', async () => {
      const repo = context.getTicketRepository();
      const ticketTool = context.getCreateTicketTool();

      // Create multiple tickets for same customer
      const ticket1 = await ticketTool.execute({
        customerId: 'test-customer-001',
        subject: 'First ticket',
        description: 'First description',
        category: 'general',
        priority: 'low',
      });

      const ticket2 = await ticketTool.execute({
        customerId: 'test-customer-001',
        subject: 'Second ticket',
        description: 'Second description',
        category: 'billing',
        priority: 'medium',
      });

      await repo.save(ticket1);
      await repo.save(ticket2);

      // Find by customer ID
      const tickets = await repo.findByCustomerId('test-customer-001');

      expect(tickets.length).toBe(2);
      expect(tickets[0].customerId).toBe('test-customer-001');
    });

    it('should filter tickets by status', async () => {
      const repo = context.getTicketRepository();
      const ticketTool = context.getCreateTicketTool();

      const ticket = await ticketTool.execute({
        customerId: 'test-customer-001',
        subject: 'Test',
        description: 'Test',
        category: 'general',
        priority: 'low',
      });

      await repo.save(ticket);

      const openTickets = await repo.findByCustomerId('test-customer-001', {
        status: 'open',
      });

      expect(openTickets.length).toBeGreaterThan(0);
      expect(openTickets.every(t => t.status === 'open')).toBe(true);
    });
  });

  describe('Query Handlers', () => {
    it('should handle GetCustomerTickets query', async () => {
      const repo = context.getTicketRepository();
      const ticketTool = context.getCreateTicketTool();
      const handler = context.getCustomerTicketsHandler();

      // Create a ticket
      const ticket = await ticketTool.execute({
        customerId: 'test-customer-query',
        subject: 'Query test',
        description: 'Test description',
        category: 'general',
        priority: 'low',
      });

      await repo.save(ticket);

      // Query tickets
      const query: GetCustomerTicketsQuery = {
        customerId: 'test-customer-query',
        limit: 5,
      };

      const result = await handler.handle(query);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0].customerId).toBe('test-customer-query');
      }
    });

    it('should handle GetTicketDetails query', async () => {
      const repo = context.getTicketRepository();
      const ticketTool = context.getCreateTicketTool();
      const handler = context.getTicketDetailsHandler();

      // Create a ticket
      const ticket = await ticketTool.execute({
        customerId: 'test-customer-details',
        subject: 'Details test',
        description: 'Test description',
        category: 'technical',
        priority: 'high',
      });

      await repo.save(ticket);

      // Get ticket details
      const result = await handler.handle({ ticketId: ticket.id });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.id).toBe(ticket.id);
        expect(result.value.subject).toBe('Details test');
        expect(result.value.priority).toBe('high');
      }
    });

    it('should return error for non-existent ticket', async () => {
      const handler = context.getTicketDetailsHandler();

      const result = await handler.handle({ ticketId: 'TKT-999999' });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error.message).toContain('not found');
      }
    });
  });

  describe('Domain Events', () => {
    it('should publish AgentExecutionStarted event', async () => {
      const agent = context.getAgent();
      const command: HandleSupportRequestCommand = {
        request: {
          customerId: 'test-events',
          message: 'Test message',
        },
      };

      await context.getSupportRequestHandler().handle(command);

      const events = agent.pullDomainEvents();
      const startedEvent = events.find((e: any) => e.eventType === 'AgentExecutionStarted');

      expect(startedEvent).toBeDefined();
    });

    it('should publish AgentExecutionCompleted event', async () => {
      const agent = context.getAgent();
      const command: HandleSupportRequestCommand = {
        request: {
          customerId: 'test-events',
          message: 'Test message',
        },
      };

      await context.getSupportRequestHandler().handle(command);

      const events = agent.pullDomainEvents();
      const completedEvent = events.find((e: any) => e.eventType === 'AgentExecutionCompleted');

      expect(completedEvent).toBeDefined();
      // Note: Domain events structure may vary - just verify the event exists
      if (completedEvent) {
        expect(completedEvent).toHaveProperty('eventType');
        expect((completedEvent as any).eventType).toBe('AgentExecutionCompleted');
      }
    });
  });
});
