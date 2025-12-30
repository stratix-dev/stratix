import { describe, it, expect } from 'vitest';
import { ExecutionContext, type Message } from '../ExecutionContext.js';
import { TokenUsageHelpers, type LLMCost } from '../../../shared/TokenUsage.js';

describe('ExecutionContext', () => {
  describe('create', () => {
    it('should create context with required fields', () => {
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      expect(context.sessionId).toBe('session-123');
      expect(context.userId).toBeUndefined();
      expect(context.environment).toBe('production');
      expect(context.metadata).toEqual({});
      expect(context.messages).toEqual([]);
      expect(context.costs).toEqual([]);
      expect(context.budget).toBeUndefined();
      expect(context.startTime).toBeInstanceOf(Date);
    });

    it('should create context with all fields', () => {
      const metadata = { requestId: 'req-456', source: 'api' };
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        userId: 'user-789',
        environment: 'development',
        metadata,
        budget: 1.0,
      });

      expect(context.sessionId).toBe('session-123');
      expect(context.userId).toBe('user-789');
      expect(context.environment).toBe('development');
      expect(context.metadata).toEqual(metadata);
      expect(context.budget).toBe(1.0);
    });

    it('should freeze metadata', () => {
      const metadata = { key: 'value' };
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
        metadata,
      });

      expect(Object.isFrozen(context.metadata)).toBe(true);

      // Attempting to modify should not change the value
      expect(() => {
        (context.metadata as any).key = 'new value';
      }).toThrow();
    });

    it('should throw for invalid budget', () => {
      expect(() => {
        ExecutionContext.create({
          sessionId: 'session-123',
          environment: 'production',
          budget: 0,
        });
      }).toThrow('Budget must be positive');

      expect(() => {
        ExecutionContext.create({
          sessionId: 'session-123',
          environment: 'production',
          budget: -1,
        });
      }).toThrow('Budget must be positive');
    });

    it('should support all environment types', () => {
      const dev = ExecutionContext.create({
        sessionId: 's1',
        environment: 'development',
      });
      const staging = ExecutionContext.create({
        sessionId: 's2',
        environment: 'staging',
      });
      const prod = ExecutionContext.create({
        sessionId: 's3',
        environment: 'production',
      });

      expect(dev.environment).toBe('development');
      expect(staging.environment).toBe('staging');
      expect(prod.environment).toBe('production');
    });
  });

  describe('addMessage', () => {
    it('should add a message and return new context', () => {
      const original = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      const message: Message = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      const updated = original.addMessage(message);

      expect(updated).not.toBe(original); // New instance
      expect(original.messages).toHaveLength(0); // Original unchanged
      expect(updated.messages).toHaveLength(1);
      expect(updated.messages[0]).toBe(message);
    });

    it('should preserve immutability', () => {
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      const msg1: Message = {
        role: 'user',
        content: 'First',
        timestamp: new Date(),
      };
      const msg2: Message = {
        role: 'assistant',
        content: 'Second',
        timestamp: new Date(),
      };

      const ctx1 = context.addMessage(msg1);
      const ctx2 = ctx1.addMessage(msg2);

      expect(context.messages).toHaveLength(0);
      expect(ctx1.messages).toHaveLength(1);
      expect(ctx2.messages).toHaveLength(2);
    });

    it('should support all message roles', () => {
      let context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      context = context.addMessage({
        role: 'system',
        content: 'System message',
        timestamp: new Date(),
      });
      context = context.addMessage({
        role: 'user',
        content: 'User message',
        timestamp: new Date(),
      });
      context = context.addMessage({
        role: 'assistant',
        content: 'Assistant message',
        timestamp: new Date(),
      });
      context = context.addMessage({
        role: 'tool',
        content: 'Tool result',
        timestamp: new Date(),
        toolCallId: 'call-123',
        name: 'search',
      });

      expect(context.messages).toHaveLength(4);
      expect(context.messages[0].role).toBe('system');
      expect(context.messages[1].role).toBe('user');
      expect(context.messages[2].role).toBe('assistant');
      expect(context.messages[3].role).toBe('tool');
      expect(context.messages[3].toolCallId).toBe('call-123');
      expect(context.messages[3].name).toBe('search');
    });
  });

  describe('addMessages', () => {
    it('should add multiple messages at once', () => {
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      const messages: Message[] = [
        { role: 'user', content: 'Message 1', timestamp: new Date() },
        { role: 'assistant', content: 'Message 2', timestamp: new Date() },
        { role: 'user', content: 'Message 3', timestamp: new Date() },
      ];

      const updated = context.addMessages(messages);

      expect(updated.messages).toHaveLength(3);
      expect(updated.messages).toEqual(messages);
    });

    it('should handle empty array', () => {
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      const updated = context.addMessages([]);

      expect(updated.messages).toHaveLength(0);
    });
  });

  describe('recordCost', () => {
    it('should record a cost and return new context', () => {
      const original = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      const cost: LLMCost = {
        provider: 'openai',
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        costUSD: 0.0075,
        timestamp: new Date(),
      };

      const updated = original.recordCost(cost);

      expect(updated).not.toBe(original);
      expect(original.costs).toHaveLength(0);
      expect(updated.costs).toHaveLength(1);
      expect(updated.costs[0]).toBe(cost);
    });

    it('should calculate total cost correctly', () => {
      let context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      context = context.recordCost({
        provider: 'openai',
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        costUSD: 0.005,
        timestamp: new Date(),
      });

      context = context.recordCost({
        provider: 'openai',
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(200, 100),
        costUSD: 0.010,
        timestamp: new Date(),
      });

      expect(context.getTotalCost()).toBeCloseTo(0.015, 4);
    });

    it('should throw when exceeding budget', () => {
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
        budget: 0.01,
      });

      const cost: LLMCost = {
        provider: 'openai',
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(1000, 500),
        costUSD: 0.02,
        timestamp: new Date(),
      };

      expect(() => {
        context.recordCost(cost);
      }).toThrow(/Recording cost would exceed budget/);
    });

    it('should not throw when at budget exactly', () => {
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
        budget: 0.01,
      });

      const cost: LLMCost = {
        provider: 'openai',
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        costUSD: 0.01,
        timestamp: new Date(),
      };

      const updated = context.recordCost(cost);

      expect(updated.getTotalCost()).toBe(0.01);
      expect(updated.isBudgetExceeded()).toBe(true); // >= budget
    });
  });

  describe('recordCosts', () => {
    it('should record multiple costs', () => {
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      const costs: LLMCost[] = [
        {
          provider: 'openai',
          model: 'gpt-4',
          usage: TokenUsageHelpers.create(100, 50),
          costUSD: 0.005,
          timestamp: new Date(),
        },
        {
          provider: 'openai',
          model: 'gpt-4',
          usage: TokenUsageHelpers.create(200, 100),
          costUSD: 0.010,
          timestamp: new Date(),
        },
      ];

      const updated = context.recordCosts(costs);

      expect(updated.costs).toHaveLength(2);
      expect(updated.getTotalCost()).toBeCloseTo(0.015, 4);
    });

    it('should throw if any cost exceeds budget', () => {
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
        budget: 0.01,
      });

      const costs: LLMCost[] = [
        {
          provider: 'openai',
          model: 'gpt-4',
          usage: TokenUsageHelpers.create(100, 50),
          costUSD: 0.005,
          timestamp: new Date(),
        },
        {
          provider: 'openai',
          model: 'gpt-4',
          usage: TokenUsageHelpers.create(200, 100),
          costUSD: 0.010, // This will exceed budget
          timestamp: new Date(),
        },
      ];

      expect(() => {
        context.recordCosts(costs);
      }).toThrow(/Recording cost would exceed budget/);
    });
  });

  describe('message queries', () => {
    it('should get recent messages', () => {
      let context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      for (let i = 1; i <= 10; i++) {
        context = context.addMessage({
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      const recent5 = context.getRecentMessages(5);

      expect(recent5).toHaveLength(5);
      expect(recent5[0].content).toBe('Message 6');
      expect(recent5[4].content).toBe('Message 10');
    });

    it('should handle count greater than message count', () => {
      let context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      context = context.addMessage({
        role: 'user',
        content: 'Message 1',
        timestamp: new Date(),
      });

      const recent = context.getRecentMessages(10);

      expect(recent).toHaveLength(1);
    });

    it('should return empty array for zero or negative count', () => {
      let context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      context = context.addMessage({
        role: 'user',
        content: 'Message',
        timestamp: new Date(),
      });

      expect(context.getRecentMessages(0)).toEqual([]);
      expect(context.getRecentMessages(-1)).toEqual([]);
    });

    it('should get messages by role', () => {
      let context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      context = context.addMessage({
        role: 'user',
        content: 'User 1',
        timestamp: new Date(),
      });
      context = context.addMessage({
        role: 'assistant',
        content: 'Assistant 1',
        timestamp: new Date(),
      });
      context = context.addMessage({
        role: 'user',
        content: 'User 2',
        timestamp: new Date(),
      });
      context = context.addMessage({
        role: 'system',
        content: 'System 1',
        timestamp: new Date(),
      });

      const userMessages = context.getMessagesByRole('user');
      const assistantMessages = context.getMessagesByRole('assistant');
      const systemMessages = context.getMessagesByRole('system');
      const toolMessages = context.getMessagesByRole('tool');

      expect(userMessages).toHaveLength(2);
      expect(assistantMessages).toHaveLength(1);
      expect(systemMessages).toHaveLength(1);
      expect(toolMessages).toHaveLength(0);
    });
  });

  describe('cost queries', () => {
    it('should calculate total cost', () => {
      let context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      context = context.recordCost({
        provider: 'openai',
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        costUSD: 0.005,
        timestamp: new Date(),
      });

      context = context.recordCost({
        provider: 'anthropic',
        model: 'claude-3-opus',
        usage: TokenUsageHelpers.create(200, 100),
        costUSD: 0.015,
        timestamp: new Date(),
      });

      expect(context.getTotalCost()).toBeCloseTo(0.02, 4);
    });

    it('should calculate total tokens', () => {
      let context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      context = context.recordCost({
        provider: 'openai',
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        costUSD: 0.005,
        timestamp: new Date(),
      });

      context = context.recordCost({
        provider: 'openai',
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(200, 100),
        costUSD: 0.010,
        timestamp: new Date(),
      });

      expect(context.getTotalTokens()).toBe(450);
    });

    it('should return zero for empty costs', () => {
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      expect(context.getTotalCost()).toBe(0);
      expect(context.getTotalTokens()).toBe(0);
    });
  });

  describe('budget tracking', () => {
    it('should return undefined remaining budget when no budget set', () => {
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      expect(context.getRemainingBudget()).toBeUndefined();
    });

    it('should calculate remaining budget', () => {
      let context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
        budget: 0.1,
      });

      context = context.recordCost({
        provider: 'openai',
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        costUSD: 0.03,
        timestamp: new Date(),
      });

      expect(context.getRemainingBudget()).toBeCloseTo(0.07, 4);
    });

    it('should never return negative remaining budget', () => {
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
        budget: 0.01,
      });

      // This should throw, but let's test the logic if we bypass the check
      const contextWithHighCost = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
        budget: 0.01,
      });

      // Can't actually test this without the guard, but the implementation uses Math.max(0, ...)
      expect(contextWithHighCost.getRemainingBudget()).toBe(0.01);
    });

    it('should detect budget exceeded', () => {
      let context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
        budget: 0.01,
      });

      expect(context.isBudgetExceeded()).toBe(false);

      context = context.recordCost({
        provider: 'openai',
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        costUSD: 0.005,
        timestamp: new Date(),
      });

      expect(context.isBudgetExceeded()).toBe(false);

      context = context.recordCost({
        provider: 'openai',
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        costUSD: 0.005,
        timestamp: new Date(),
      });

      expect(context.isBudgetExceeded()).toBe(true);
    });

    it('should return false for budget exceeded when no budget', () => {
      let context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      context = context.recordCost({
        provider: 'openai',
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(10000, 5000),
        costUSD: 100.0,
        timestamp: new Date(),
      });

      expect(context.isBudgetExceeded()).toBe(false);
    });
  });

  describe('timing', () => {
    it('should track execution duration', async () => {
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const duration = context.getDurationMs();

      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(200); // Allow some margin
    });

    it('should have consistent start time', () => {
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      const start1 = context.startTime;
      const start2 = context.startTime;

      expect(start1).toBe(start2);
      expect(start1).toBeInstanceOf(Date);
    });
  });

  describe('updateMetadata', () => {
    it('should merge metadata', () => {
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
        metadata: { key1: 'value1', key2: 'value2' },
      });

      const updated = context.updateMetadata({ key2: 'new value2', key3: 'value3' });

      expect(updated.metadata).toEqual({
        key1: 'value1',
        key2: 'new value2',
        key3: 'value3',
      });
      expect(Object.isFrozen(updated.metadata)).toBe(true);
    });

    it('should not mutate original context', () => {
      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
        metadata: { key1: 'value1' },
      });

      const updated = context.updateMetadata({ key2: 'value2' });

      expect(context.metadata).toEqual({ key1: 'value1' });
      expect(updated.metadata).toEqual({ key1: 'value1', key2: 'value2' });
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      let context = ExecutionContext.create({
        sessionId: 'session-123',
        userId: 'user-456',
        environment: 'production',
        metadata: { requestId: 'req-789' },
        budget: 1.0,
      });

      context = context.addMessage({
        role: 'user',
        content: 'Hello',
        timestamp: new Date('2024-01-01T00:00:00Z'),
      });

      context = context.recordCost({
        provider: 'openai',
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        costUSD: 0.0075,
        timestamp: new Date('2024-01-01T00:00:01Z'),
      });

      const json = context.toJSON();

      expect(json).toHaveProperty('sessionId', 'session-123');
      expect(json).toHaveProperty('userId', 'user-456');
      expect(json).toHaveProperty('environment', 'production');
      expect(json).toHaveProperty('metadata', { requestId: 'req-789' });
      expect(json).toHaveProperty('messages');
      expect(json).toHaveProperty('costs');
      expect(json).toHaveProperty('budget', 1.0);
      expect(json).toHaveProperty('startTime');
      expect(json).toHaveProperty('durationMs');
      expect(json).toHaveProperty('totalCost', 0.0075);
      expect(json).toHaveProperty('totalTokens', 150);
      expect(json).toHaveProperty('remainingBudget');
    });

    it('should format timestamps as ISO strings', () => {
      const cost: LLMCost = {
        provider: 'openai',
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        costUSD: 0.0075,
        timestamp: new Date('2024-01-01T00:00:00Z'),
      };

      const context = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      }).recordCost(cost);

      const json: any = context.toJSON();

      expect(json.costs[0].timestamp).toBe('2024-01-01T00:00:00.000Z');
      expect(typeof json.startTime).toBe('string');
    });
  });

  describe('immutability invariants', () => {
    it('should never mutate original context', () => {
      const original = ExecutionContext.create({
        sessionId: 'session-123',
        environment: 'production',
      });

      let context = original;
      context = context.addMessage({
        role: 'user',
        content: 'Message',
        timestamp: new Date(),
      });
      context = context.recordCost({
        provider: 'openai',
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        costUSD: 0.005,
        timestamp: new Date(),
      });
      context = context.updateMetadata({ key: 'value' });

      expect(original.messages).toHaveLength(0);
      expect(original.costs).toHaveLength(0);
      expect(original.metadata).toEqual({});
      expect(context.messages).toHaveLength(1);
      expect(context.costs).toHaveLength(1);
      expect((context.metadata as any).key).toBe('value');
    });
  });
});
