import { describe, it, expect, beforeEach } from 'vitest';
import { EntityId } from '@stratix/core';
import type { LLMProvider, ChatParams, ChatResponse, ChatChunk, EmbeddingParams, EmbeddingResponse } from '@stratix/core';
import { CustomerSupportAgent } from '../domain/CustomerSupportAgent.js';
import type { CustomerInquiry } from '../domain/CustomerSupportAgent.js';

/**
 * Mock LLM Provider for testing
 * Returns predictable responses based on the input
 */
class MockLLMProvider implements LLMProvider {
  readonly name = 'mock';
  readonly models = ['mock-model'];

  async chat(params: ChatParams): Promise<ChatResponse> {
    // Extract the user message to determine the response
    const userMessage = params.messages.find((m) => m.role === 'user')?.content || '';

    // Generate a mock response based on the inquiry text
    let category: 'billing' | 'technical' | 'general' | 'complaint' = 'general';
    let escalationRequired = false;
    let confidence = 0.85;

    // Categorize based on keywords
    const lowerText = userMessage.toLowerCase();
    if (lowerText.includes('charged') || lowerText.includes('refund') || lowerText.includes('payment') || lowerText.includes('bill')) {
      category = 'billing';
      confidence = 0.85;
    } else if (lowerText.includes('crash') || lowerText.includes('error') || lowerText.includes('bug') || lowerText.includes('login')) {
      category = 'technical';
      confidence = 0.85;
    } else if (lowerText.includes('unacceptable') || lowerText.includes('worst') || lowerText.includes('angry')) {
      category = 'complaint';
      escalationRequired = true;
      confidence = 0.9;
    }

    // Check for urgency
    if (lowerText.includes('urgent') || lowerText.includes('immediately') || lowerText.includes('emergency') || lowerText.includes('asap')) {
      escalationRequired = true;
    }

    // Check for multiple previous attempts
    if (userMessage.includes('Previous attempt 1') || lowerText.includes('still having')) {
      escalationRequired = true;
    }

    // Check if category was suggested
    if (lowerText.includes('suggested category: billing')) {
      category = 'billing';
      confidence = 0.9;
    } else if (lowerText.includes('suggested category: technical')) {
      category = 'technical';
      confidence = 0.9;
    } else if (lowerText.includes('suggested category: complaint')) {
      category = 'complaint';
      confidence = 0.9;
    } else if (lowerText.includes('suggested category: general')) {
      category = 'general';
      confidence = 0.9;
    }

    const mockResponse = {
      responseText: `Thank you for contacting us. I'll help you with your ${category} inquiry.`,
      category,
      escalationRequired,
      suggestedActions: [
        'Action 1 for ' + category,
        'Action 2 for ' + category,
        'Action 3 for ' + category,
      ],
      confidence,
    };

    return {
      content: JSON.stringify(mockResponse),
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
      finishReason: 'stop',
    };
  }

  async *streamChat(_params: ChatParams): AsyncIterable<ChatChunk> {
    yield { content: 'Mock streaming response', isComplete: true };
  }

  async embeddings(_params: EmbeddingParams): Promise<EmbeddingResponse> {
    return {
      embeddings: [[0.1, 0.2, 0.3]],
      usage: {
        promptTokens: 10,
        completionTokens: 0,
        totalTokens: 10,
      },
    };
  }
}

describe('CustomerSupportAgent', () => {
  let agent: CustomerSupportAgent;
  let mockProvider: MockLLMProvider;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    agent = new CustomerSupportAgent(
      EntityId.create<'AIAgent'>(),
      new Date(),
      new Date(),
      mockProvider
    );
  });

  describe('Agent Configuration', () => {
    it('should create agent with correct metadata', () => {
      expect(agent.name).toBe('Customer Support Agent');
      expect(agent.description).toContain('customer support');
      expect(agent.version.value).toBe('1.0.0');
    });

    it('should have required capabilities', () => {
      const capabilities = agent.capabilities;

      expect(capabilities).toContain('customer_support');
      expect(capabilities).toContain('sentiment_analysis');
      expect(capabilities).toContain('ticket_creation');
      expect(capabilities).toContain('knowledge_base_search');
    });

    it('should have correct model configuration', () => {
      const config = agent.model;

      expect(config.provider).toBe('openai');
      expect(config.model).toBe('gpt-4o-mini');
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(1000);
    });
  });

  describe('Execute', () => {
    it('should handle billing inquiry', async () => {
      const inquiry: CustomerInquiry = {
        customerId: 'cust-001',
        inquiryText: 'I was charged twice for my order',
        category: 'billing',
      };

      const result = await agent.executeWithEvents(inquiry);

      expect(result.isSuccess()).toBe(true);
      expect(result.data?.category).toBe('billing');
      expect(result.data?.responseText).toBeTruthy();
      expect(result.data?.suggestedActions).toBeInstanceOf(Array);
    });

    it('should handle technical inquiry', async () => {
      const inquiry: CustomerInquiry = {
        customerId: 'cust-002',
        inquiryText: 'The app crashes when I upload photos',
        category: 'technical',
      };

      const result = await agent.executeWithEvents(inquiry);

      expect(result.isSuccess()).toBe(true);
      expect(result.data?.category).toBe('technical');
      expect(result.data?.confidence).toBeGreaterThan(0);
    });

    it('should handle complaint with escalation', async () => {
      const inquiry: CustomerInquiry = {
        customerId: 'cust-003',
        inquiryText: 'This is unacceptable! Worst service ever!',
        category: 'complaint',
      };

      const result = await agent.executeWithEvents(inquiry);

      expect(result.isSuccess()).toBe(true);
      expect(result.data?.category).toBe('complaint');
      expect(result.data?.escalationRequired).toBe(true);
    });

    it('should auto-categorize billing inquiries', async () => {
      const inquiry: CustomerInquiry = {
        customerId: 'cust-004',
        inquiryText: 'I need a refund for the payment',
      };

      const result = await agent.executeWithEvents(inquiry);

      expect(result.isSuccess()).toBe(true);
      expect(result.data?.category).toBe('billing');
    });

    it('should auto-categorize technical inquiries', async () => {
      const inquiry: CustomerInquiry = {
        customerId: 'cust-005',
        inquiryText: 'Getting an error message when I try to login',
      };

      const result = await agent.executeWithEvents(inquiry);

      expect(result.isSuccess()).toBe(true);
      expect(result.data?.category).toBe('technical');
    });

    it('should escalate when urgent keywords present', async () => {
      const inquiry: CustomerInquiry = {
        customerId: 'cust-006',
        inquiryText: 'URGENT: I need help immediately!',
        category: 'general',
      };

      const result = await agent.executeWithEvents(inquiry);

      expect(result.isSuccess()).toBe(true);
      expect(result.data?.escalationRequired).toBe(true);
    });

    it('should escalate after multiple failed attempts', async () => {
      const inquiry: CustomerInquiry = {
        customerId: 'cust-007',
        inquiryText: 'Still having the same problem',
        category: 'technical',
        previousContext: [
          'Previous attempt 1 failed',
          'Previous attempt 2 failed',
          'Previous attempt 3 failed',
        ],
      };

      const result = await agent.executeWithEvents(inquiry);

      expect(result.isSuccess()).toBe(true);
      expect(result.data?.escalationRequired).toBe(true);
    });

    it('should include suggested actions', async () => {
      const inquiry: CustomerInquiry = {
        customerId: 'cust-008',
        inquiryText: 'How do I track my order?',
        category: 'general',
      };

      const result = await agent.executeWithEvents(inquiry);

      expect(result.isSuccess()).toBe(true);
      expect(result.data?.suggestedActions).toBeInstanceOf(Array);
      expect(result.data?.suggestedActions.length).toBeGreaterThan(0);
    });
  });

  describe('Domain Events', () => {
    it('should record execution started event', async () => {
      const inquiry: CustomerInquiry = {
        customerId: 'cust-009',
        inquiryText: 'Test inquiry',
        category: 'general',
      };

      await agent.executeWithEvents(inquiry);

      const events = agent.pullDomainEvents();
      const startedEvent = events.find((e: any) => e.eventType === 'AgentExecutionStarted');

      expect(startedEvent).toBeDefined();
      expect(startedEvent).toMatchObject({
        eventType: 'AgentExecutionStarted',
        agentName: 'Customer Support Agent',
      });
    });

    it('should record execution completed event', async () => {
      const inquiry: CustomerInquiry = {
        customerId: 'cust-010',
        inquiryText: 'Test inquiry',
        category: 'general',
      };

      await agent.executeWithEvents(inquiry);

      const events = agent.pullDomainEvents();
      const completedEvent = events.find(
        (e: any) => e.eventType === 'AgentExecutionCompleted'
      );

      expect(completedEvent).toBeDefined();
      expect(completedEvent).toMatchObject({
        eventType: 'AgentExecutionCompleted',
        agentName: 'Customer Support Agent',
      });
      expect((completedEvent as any).durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Confidence Scoring', () => {
    it('should have higher confidence for explicit categories', async () => {
      const inquiry: CustomerInquiry = {
        customerId: 'cust-011',
        inquiryText: 'I have a question',
        category: 'general',
      };

      const result = await agent.executeWithEvents(inquiry);

      expect(result.isSuccess()).toBe(true);
      expect(result.data?.confidence).toBeGreaterThan(0.8);
    });

    it('should have reasonable confidence for auto-categorized inquiries', async () => {
      const inquiry: CustomerInquiry = {
        customerId: 'cust-012',
        inquiryText: 'Something about my order',
      };

      const result = await agent.executeWithEvents(inquiry);

      expect(result.isSuccess()).toBe(true);
      expect(result.data?.confidence).toBeGreaterThan(0.6);
      expect(result.data?.confidence).toBeLessThanOrEqual(1.0);
    });
  });
});
